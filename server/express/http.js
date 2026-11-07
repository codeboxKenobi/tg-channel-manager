export const httpError = (message, status = 400) => Object.assign(new Error(message), { status });
