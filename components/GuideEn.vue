<template>
  <section id="start" class="card guide-section prose">
    <h2>Quick start</h2>
    <p>To publish your first post, go through the steps in order. Steps 2–5 are done by an administrator: an editor only needs a channel to be assigned to them.</p>
    <ol class="guide-steps">
      <li><b>Sign in.</b> An administrator can sign up on their own if registration is enabled (if an invitation code is requested, the server owner provides it). An editor account is created by an administrator.</li>
      <li><b>Connect the bot.</b> On the “Bot” page, paste the token of the bot you created with @BotFather.</li>
      <li><b>Add the bot to the channel.</b> Make it a channel administrator with permission to post messages.</li>
      <li><b>Connect the channel.</b> On the <NuxtLink to="/">“Channels”</NuxtLink> page, enter the channel @username or numeric id.</li>
      <li><b>Give editors access.</b> Create an editor on the “Users” page and assign the channels they need.</li>
      <li><b>Prepare a post.</b> Write it in <NuxtLink to="/drafts">“Post preparation”</NuxtLink> or take a ready-made one from the <NuxtLink to="/parser">“Parser”</NuxtLink>.</li>
      <li><b>Publish.</b> Choose a time or click “Publish now”. See the result in “Published” and “Metrics”.</li>
    </ol>
  </section>

  <section id="roles" class="card guide-section prose">
    <h2>Roles and access</h2>
    <dl class="defs">
      <dt><span class="badge">Administrator</span></dt>
      <dd>Manages their own isolated workspace: their own bot, channels, posts, metrics, parser sources and editors. The data of other administrators is not visible to them.</dd>
      <dt><span class="badge">Editor</span></dt>
      <dd>Works only with the channels an administrator has assigned to them: prepares and publishes posts, views metrics, uses the parser. All other channels are hidden from them.</dd>
    </dl>
  </section>

  <section id="bot" class="card guide-section prose">
    <h2>Bot <span class="badge ml-2">for administrators</span></h2>
    <p>Publishing, statistics and the counting of readers’ reactions work through your bot. Each administrator has their own bot.</p>
    <h3>How to connect it</h3>
    <ol>
      <li>In Telegram, open @BotFather, create a bot with the <code>/newbot</code> command and copy the token.</li>
      <li>On the “Bot” page, paste the token into the “Bot token” field and click “Save”.</li>
    </ol>
    <p class="callout">The token is stored on the server in encrypted form and is not shown anywhere after saving. One bot can be connected to only one administrator.</p>
    <h3>Replacing and disconnecting</h3>
    <p>A new token replaces the previous bot. You need to add the new bot as an administrator to your channels again, otherwise publishing and the counting of reactions will not work. “Like” buttons under posts published earlier stop working.</p>
    <p class="callout callout-warn">If you disconnect the bot, publishing, statistics collection and the counting of reactions stop, and scheduled posts get the failed status.</p>
  </section>

  <section id="channels" class="card guide-section prose">
    <h2>Channels</h2>
    <p>The <NuxtLink to="/">“Channels”</NuxtLink> page lists the channels of your workspace. An editor sees only the channels assigned to them.</p>
    <h3>How to connect a channel <span class="badge ml-2">for administrators</span></h3>
    <ol>
      <li>Add the bot as a channel administrator with permission to post messages.</li>
      <li>In the “Connect a channel” block, enter the @username or numeric id. For a private channel the id looks like <code>-1001234567890</code>.</li>
      <li>Click “Connect”.</li>
    </ol>
    <h3>The channel card</h3>
    <p>The card shows the number of subscribers, the number of published posts and of posts in preparation. An administrator also sees which editors have access to the channel.</p>
    <dl class="defs">
      <dt><b>Refresh data</b></dt>
      <dd>Pulls the title, description and subscriber count from Telegram.</dd>
      <dt><b>Access</b></dt>
      <dd>Choose which editors can work with the channel.</dd>
      <dt><b>Disable publishing</b></dt>
      <dd>The channel stays in the list marked “Disabled”, and scheduled posts are not sent to it. You can enable publishing again at any time.</dd>
      <dt><b>Delete</b></dt>
      <dd>Removes the channel together with its posts and statistics.</dd>
    </dl>
  </section>

  <section id="parser" class="card guide-section prose">
    <h2>Parser</h2>
    <p>The parser collects posts from public Telegram channels so you can quickly turn them into your own drafts. It reads the channel’s public web version (t.me/s/…), so private channels and channels with the public preview disabled will not work.</p>
    <h3>Adding a source channel</h3>
    <p>Enter the @username or link of a channel and click “Add”. You can add up to 50 sources per workspace.</p>
    <h3>Loading posts</h3>
    <ol>
      <li>Tick the channels you need in the “Channels to parse” list, or select all at once.</li>
      <li>Choose how many latest posts to load: 20, 50, 100 or 200.</li>
      <li>Click “Parse selected”. Up to 20 channels can be processed at a time.</li>
    </ol>
    <p>Posts that are already saved are not duplicated. Text, photos and videos are collected. Links, @mentions, hashtags and promotional signatures are removed from the text, and posts without text are skipped.</p>
    <h3>Parsed posts</h3>
    <p>You can filter the list by source and find a post by its text. Long texts are collapsed; expand them with the “Show full text” button.</p>
    <h3>How to use a post</h3>
    <ol>
      <li>In the “Publishing channel” block, choose the channel the post will go to.</li>
      <li>Click “Create post”: a draft appears in “Post preparation”.</li>
      <li>Edit it and publish it or put it on the schedule.</li>
    </ol>
    <p class="callout">If you delete a source, its parsed posts are deleted too. Drafts already created from them stay.</p>
  </section>

  <section id="drafts" class="card guide-section prose">
    <h2>Post preparation</h2>
    <p>This is where posts are created, edited and published. The list refreshes itself every 30 seconds: published posts move to the “Published” section.</p>
    <h3>New post</h3>
    <p>Click “New post” and fill in the form:</p>
    <ul>
      <li><b>Channel</b>: where the post will be published. If you have several channels, you can tick several at once or click “Select all” when creating a post: a separate post is created for each channel, with its own status and publishing result. When editing a post, one channel is chosen.</li>
      <li><b>Title</b>: visible only to you, it helps you find the post in the list.</li>
      <li><b>Text</b>: up to 4096 characters, or up to 1024 if a photo, video or file is attached to the post. Under the text field there is an “😊 Emoji” button: choose a category and click an emoji to insert it at the cursor.</li>
      <li><b>Attachment</b>: a post can have one attachment: a picture (JPEG, PNG or WebP up to 10 MB), an MP4 video, or a PDF, TXT or Excel (XLSX, XLS) file up to 50 MB. Paste a link or click “Upload from device”. A file is sent to the channel as a document under its own name, and the post text becomes the caption.</li>
      <li><b>Formatting</b>: no formatting, HTML or MarkdownV2.</li>
    </ul>
    <h3>Publication time</h3>
    <p>Choose a date, hours and minutes (in 5-minute steps) or use the quick options: “In one hour”, “Today at 18:00”, “Tomorrow at 9:00”. The time is set in the time zone of your device. If no time is chosen, the post is saved as a draft. If the chosen time has already passed, the post is published within a minute.</p>
    <h3>Statuses</h3>
    <dl class="defs">
      <dt><span class="badge">Draft</span></dt>
      <dd>The post is saved but not put on the schedule.</dd>
      <dt><span class="badge scheduled">Scheduled</span></dt>
      <dd>The post will be published at the chosen time.</dd>
      <dt><span class="badge publishing">Publishing</span></dt>
      <dd>The post is being sent to the channel. It cannot be edited or deleted at this time.</dd>
      <dt><span class="badge failed">Publishing failed</span></dt>
      <dd>The reason is shown in the card. Fix it and publish the post again.</dd>
    </dl>
    <h3>Actions on a post</h3>
    <dl class="defs">
      <dt><b>Edit</b></dt>
      <dd>Change any field, including the publication time. The form opens right in place of the post in the list.</dd>
      <dt><b>Publish now</b></dt>
      <dd>Send the post to the channel immediately, after confirmation.</dd>
      <dt><b>Remove from schedule</b></dt>
      <dd>Return a scheduled post to drafts.</dd>
      <dt><b>Delete</b></dt>
      <dd>Delete the post from preparation.</dd>
    </dl>
  </section>

  <section id="published" class="card guide-section prose">
    <h2>Published</h2>
    <p>The <NuxtLink to="/published">“Published”</NuxtLink> section lists posts that have already been sent to channels. You can filter the list by channel.</p>
    <ul>
      <li>The card shows a counter of readers’ reactions (❤️), which Telegram passes on; see the “Metrics” section. If there are no reactions, the counter is not shown.</li>
      <li>The “Open in Telegram” button leads to the post in the channel. It is available for channels with a public @username.</li>
      <li>A published post cannot be edited.</li>
    </ul>
    <p class="callout">When you delete, you are first asked about the entry in the app and then about the message in the channel. You can delete only the entry and leave the message in the channel.</p>
  </section>

  <section id="metrics" class="card guide-section prose">
    <h2>Metrics</h2>
    <p>The <NuxtLink to="/metrics">“Metrics”</NuxtLink> section shows how your channels are doing. Choose a channel in the filter or view the summary for all of them at once.</p>
    <ul>
      <li><b>Summary</b>: subscribers, published posts, readers’ reactions, scheduled posts and drafts.</li>
      <li><b>Last 30 days</b>: charts of posts, reactions and subscribers by day. Reactions on the chart belong to the day the post was published.</li>
      <li><b>Reactions by type</b>: how many times readers put 👍, ❤️, 🔥 and other reactions.</li>
      <li><b>Channels</b>: a table with subscribers, 30-day growth, the number of posts, reactions and reactions per post.</li>
      <li><b>Top posts</b>: the posts with the most reactions, with the kinds of reactions shown next to them.</li>
    </ul>
    <p class="callout">The subscriber count is recorded once an hour, so the subscribers chart fills up gradually.</p>
    <p class="callout">Reactions come from Telegram with a delay, and only reactions made after reaction counting was switched on are counted: Telegram does not pass earlier ones to the bot. For this the bot must be a channel administrator and reactions must be enabled in the channel. The app does not show post views: Telegram does not give them to bots.</p>
  </section>

  <section id="users" class="card guide-section prose">
    <h2>Users <span class="badge ml-2">for administrators</span></h2>
    <p>On the “Users” page an administrator manages their editors.</p>
    <ol>
      <li>Enter the email, name and password (at least 8 characters) and click “Add”.</li>
      <li>In the table, click “Channels” and choose which channels the editor will have access to. Until access is granted, the editor will see nothing.</li>
      <li>If an editor forgets their password, click “Reset password” and set a new one.</li>
      <li>The “Delete” button removes an editor: their account and access to channels are deleted, and the posts they created stay.</li>
    </ol>
  </section>

  <section id="account" class="card guide-section prose">
    <h2>Profile</h2>
    <p>The <NuxtLink to="/account">“Profile”</NuxtLink> page opens by clicking your name in the top right corner. It shows your name, email and role, and lets you change your password: enter the current one and the new one (at least 8 characters). In the “Interface language” block you choose the language of the app; see the “Interface language” section for details. The “Sign out” button is next to your name. You can also delete your account here; see the “Deleting an account” section for details.</p>
  </section>

  <section id="language" class="card guide-section prose">
    <h2>Interface language</h2>
    <p>The app is available in Russian and English. The language is set per account and saved on the server, so on another device or in another browser the interface opens in the same language. This guide is shown in the selected language too.</p>
    <h3>How to switch the language</h3>
    <ol>
      <li>Open <NuxtLink to="/account">“Profile”</NuxtLink> (your name in the top right corner).</li>
      <li>In the “Interface language” block, choose “Русский” or “English” from the list.</li>
      <li>The language changes immediately and there is no need to reload the page. There is no “Save” button: the choice is remembered automatically.</li>
    </ol>
    <p>On the sign-in and sign-up pages, use the RU and EN buttons above the form. A language chosen there is used for a new account, and when you sign in to an existing account it is saved to that account.</p>
    <p class="callout">Only the interface and this guide are translated. Channel names, post titles and texts, and the messages the bot publishes to Telegram stay as you wrote them.</p>
    <p>An editor created by an administrator starts with the administrator’s language and can change it in their own profile.</p>
  </section>

  <section id="mail" class="card guide-section prose">
    <h2>Emails and password recovery</h2>
    <p>The app sends two kinds of emails. They come in the same design as the app itself and in the language of the recipient’s account.</p>

    <h3>The access email</h3>
    <p>When an administrator creates an editor, an email is sent to the new user’s address. It contains the login (which is the email), the password, a “Sign in to the app” button and a short description of how to get started. The description repeats the “Quick start” of this guide for the user’s role. The email comes in the language of the administrator who created the account; the new user can change the language in their profile.</p>
    <p class="callout callout-warn">The password was sent by email, so change it on the “Profile” page after your first sign-in and delete the email.</p>
    <p>If the email could not be sent, a warning appears under the form on the “Users” page. The account has already been created, so pass the login and password on in another way.</p>

    <h3>If you forgot your password</h3>
    <ol>
      <li>On the sign-in page click “Forgot your password?” and enter the email of your account.</li>
      <li>Open the email and copy the 6-digit code. It is valid for 15 minutes.</li>
      <li>Enter the code and a new password (at least 8 characters) and click “Change password”.</li>
      <li>Sign in with the new password. You will need to sign in again on your other devices.</li>
    </ol>
    <p>You have 5 attempts to enter the code, then request a new one. A code can be requested no more than 3 times per hour. If the email does not arrive, check your spam folder.</p>
    <p class="callout">If there is no “Forgot your password?” link on the sign-in page, email is not configured on the server: ask an administrator to reset your password on the “Users” page.</p>
  </section>

  <section id="delete" class="card guide-section prose">
    <h2>Deleting an account</h2>
    <p>You can delete your account yourself, and if you do not sign in for a long time it is deleted automatically. In both cases the data is erased permanently and cannot be restored from the app.</p>

    <h3>Deleting at your own request</h3>
    <ol>
      <li>Open <NuxtLink to="/account">“Profile”</NuxtLink> (your name in the top right corner) and find the “Delete account” block.</li>
      <li>Enter your password and click “Delete account”.</li>
      <li>Read the warning and confirm the deletion. After that you are signed out of the app.</li>
    </ol>
    <dl class="defs">
      <dt><span class="badge">Editor</span></dt>
      <dd>Only the account itself and its access to channels are deleted. The posts you created stay with the administrator.</dd>
      <dt><span class="badge">Administrator</span></dt>
      <dd>The whole workspace is deleted along with the account: channels with posts, reactions and statistics, parser sources, uploaded pictures, all their editors and the connected bot. Messages already published in Telegram channels stay where they are.</dd>
    </dl>
    <p class="callout callout-warn">When an administrator deletes their account, the accounts of their editors are deleted too. Warn them in advance.</p>

    <h3>Automatic deletion after inactivity</h3>
    <p>If nobody has signed in to or used an account for 90 days in a row, it is deleted automatically. The check runs once a day, at night in the server’s time. Any work in the app under your own account counts as activity: signing in and opening any page is enough.</p>
    <ul>
      <li>An <b>editor</b> is deleted if they have not signed in themselves for 90 days.</li>
      <li>An <b>administrator</b> is deleted only if neither they nor any of their editors have signed in for 90 days. While someone from the team works in the workspace, it is kept.</li>
    </ul>
    <p class="callout callout-warn">No warning email is sent before deletion. If you need the account, sign in at least once every 90 days. Scheduled publications do not count as activity on their own.</p>
    <p>The current period is shown in the “Delete account” block of your profile.</p>
  </section>

  <section id="faq" class="card guide-section prose">
    <h2>Frequently asked questions</h2>
    <dl class="faq">
      <dt>I see “The bot is not connected”</dt>
      <dd>An administrator needs to add the bot token on the “Bot” page. Until there is a bot, publishing and statistics collection do not work.</dd>
      <dt>A post got the “Publishing failed” status</dt>
      <dd>Read the reason in the card. Most often the bot is not a channel administrator or lacks permission to post messages, or the file link is unavailable. Fix it and click “Publish now”.</dd>
      <dt>I see “No channels have been assigned to you yet”</dt>
      <dd>Ask an administrator to give you access to channels on the “Users” page.</dd>
      <dt>A post was not sent at the scheduled time</dt>
      <dd>Check that the channel is not disabled on the “Channels” page and that the bot is still a channel administrator. Scheduled posts are checked every minute.</dd>
      <dt>I cannot add a channel to the parser</dt>
      <dd>The parser works only with public channels that have the web preview enabled (t.me/s/…). Check the @username and that the channel opens in a browser.</dd>
      <dt>The text does not fit in a post</dt>
      <dd>A text post is limited to 4096 characters, and a post with a photo, video or file to 1024. Shorten the text or remove the attachment.</dd>
      <dt>A file will not attach to a post</dt>
      <dd>Supported are JPEG, PNG and WebP pictures up to 10 MB, MP4 (H.264) videos, and PDF, TXT, XLSX and XLS files. Videos and files can be up to 50 MB: that is Telegram’s limit for bots. Save iPhone videos (.mov) as MP4 first. The file type is checked by its content, so a renamed file will not work.</dd>
      <dt>There are no reactions in Metrics, or the numbers are lower than in Telegram</dt>
      <dd>Reactions come from Telegram with a delay, and only reactions made after reaction counting was switched on are counted. The bot must be a channel administrator and reactions must be enabled in the channel. Posts published earlier start showing reactions when a new one appears under them.</dd>
      <dt>My account was deleted although I did not delete it</dt>
      <dd>Most likely nobody signed in to it for 90 days in a row, and it was deleted automatically. It cannot be restored from the app: sign up again (if registration is enabled) or ask an administrator to create an account. An administrator’s data can only be recovered from a database backup, which the server owner can do.</dd>
      <dt>How do I switch the interface language?</dt>
      <dd>Open “Profile” and choose the language in the “Interface language” block: Русский or English. The language changes immediately and is saved in your account. See the “Interface language” section for details.</dd>
      <dt>Some of the text is not in my language</dt>
      <dd>Channel names, post titles and texts, and parser source names are not translated: they stay as you or Telegram set them. Messages that come from Telegram itself are always in English.</dd>
      <dt>The sign-in page opened in a different language</dt>
      <dd>The sign-in and sign-up pages open in the language last chosen in this browser (Russian by default). Switch it with the RU and EN buttons above the form. After you sign in, your account’s language is applied, and if you chose a language manually, it is saved to your account.</dd>
      <dt>I forgot my password</dt>
      <dd>On the sign-in page click “Forgot your password?”, then enter your email and the code from the email (see the “Emails and password recovery” section). If there is no such link, ask an administrator to reset your password on the “Users” page.</dd>
      <dt>The email with the code or with access did not arrive</dt>
      <dd>Check your spam folder and the address the account was created for. A code can be requested again no more than 3 times per hour. If emails do not arrive at all, tell the server owner: the SMTP settings may not be configured.</dd>
    </dl>
  </section>
</template>
