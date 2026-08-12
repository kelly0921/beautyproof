export const beautyProofSessionCookie = "beautyproof_session_v1";
export const beautyProofSessionHeader = "x-beautyproof-session-user";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sessionUserIdFromHeaders(headers: Pick<Headers, "get">) {
  const value = headers.get(beautyProofSessionHeader);
  return value && uuidPattern.test(value) ? value : undefined;
}

export function isSessionUserId(value: string) {
  return uuidPattern.test(value);
}
