import { q } from './db.js';
import { httpError } from './http.js';
import { resetBot } from './bot.js';
import { URL_PREFIX, removeUploadIfUnused } from './uploads.js';

// Удаление аккаунтов: по желанию пользователя (POST /api/auth/delete-account) и автоматически при бездействии.
// Администратор удаляется вместе со своим пространством (каналы, посты, статистика, источники парсера, редакторы, бот):
// все эти связи в схеме каскадные (on delete cascade). Главный администратор не удаляется никогда.

const DEFAULT_INACTIVE_DAYS = 90;
const MIN_INACTIVE_DAYS = 7; // защита от опечатки вроде INACTIVE_DAYS=1
const PURGE_BATCH = 50; // за один запуск удаляется не больше стольких аккаунтов (страховка от массового удаления)

/** Срок бездействия в днях: INACTIVE_DAYS из окружения (по умолчанию 90). 0 — автоудаление отключено. */
export function inactiveDays() {
  const raw = (process.env.INACTIVE_DAYS ?? '').trim();
  if (!raw) return DEFAULT_INACTIVE_DAYS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_INACTIVE_DAYS;
  if (n === 0) return 0;
  return Math.max(MIN_INACTIVE_DAYS, Math.floor(n));
}

/**
 * Удаляет аккаунт. У администратора пропадает всё его пространство, у редактора — только он сам
 * (созданные им посты остаются, в них обнуляется автор). Возвращает { id, role } или null, если пользователя уже нет.
 */
export async function deleteAccount(userId) {
  const { rows: [u] } = await q('select id, role, is_super from users where id = $1', [userId]);
  if (!u) return null;
  if (u.is_super) throw httpError('Главный администратор не может быть удалён', 403);
  const isAdmin = u.role === 'admin';

  // загруженные файлы пространства: после удаления записей их нужно убрать с диска
  const media = isAdmin
    ? (await q(
        `select distinct p.media_url from posts p join channels c on c.id = p.channel_id
         where c.owner_id = $1 and p.media_url like $2`,
        [u.id, `${URL_PREFIX}%`],
      )).rows.map((r) => r.media_url)
    : [];

  await q('delete from users where id = $1', [u.id]); // сессии, редакторы, каналы, посты, парсер и бот уходят каскадом

  if (isAdmin) {
    await resetBot(u.id).catch(() => {}); // останавливает бота и снимает его webhook
    for (const url of media) await removeUploadIfUnused(url);
  }
  return { id: u.id, role: u.role };
}

/**
 * Автоудаление: редактор — если сам не заходил INACTIVE_DAYS дней; администратор — если не заходил ни он,
 * ни один из его редакторов (пока команда работает, пространство живёт). Главного администратора не трогает.
 */
export async function purgeInactive() {
  const days = inactiveDays();
  if (!days) return 0;
  const { rows } = await q(
    `select u.id, u.role from users u
     where not u.is_super
       and u.last_active_at < now() - make_interval(days => $1::int)
       and (u.role = 'editor'
            or not exists (select 1 from users e
                           where e.owner_id = u.id and e.last_active_at >= now() - make_interval(days => $1::int)))
     order by u.last_active_at
     limit ${PURGE_BATCH}`,
    [days],
  );
  let removed = 0;
  for (const { id, role } of rows) {
    try {
      if (await deleteAccount(id)) {
        removed++;
        console.log(`Автоудаление: аккаунт ${id} (${role === 'admin' ? 'администратор' : 'редактор'}) без активности более ${days} дн.`);
      }
    } catch (e) {
      console.error(`Автоудаление аккаунта ${id}:`, e.message);
    }
  }
  return removed;
}
