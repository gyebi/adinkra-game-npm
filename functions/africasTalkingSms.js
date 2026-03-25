import AfricasTalking from "africastalking";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanPhoneNumber(value) {
  return String(value ?? "").replace(/[^\d+]/g, "").trim();
}

export function normalizeGhanaPhoneNumber(value) {
  const normalizedValue = cleanPhoneNumber(value);

  if (!normalizedValue) {
    return null;
  }

  if (/^\+233\d{9}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  if (/^233\d{9}$/.test(normalizedValue)) {
    return `+${normalizedValue}`;
  }

  if (/^0\d{9}$/.test(normalizedValue)) {
    return `+233${normalizedValue.slice(1)}`;
  }

  if (/^\d{9}$/.test(normalizedValue)) {
    return `+233${normalizedValue}`;
  }

  return normalizedValue.startsWith("+") ? normalizedValue : `+${normalizedValue}`;
}

export function normalizeRecipientList(recipients) {
  const rawRecipients = Array.isArray(recipients) ? recipients : [recipients];
  const normalizedRecipients = rawRecipients
    .map((recipient) => normalizeGhanaPhoneNumber(recipient))
    .filter(Boolean);

  if (normalizedRecipients.length === 0) {
    throw new Error("At least one valid recipient phone number is required.");
  }

  return [...new Set(normalizedRecipients)];
}

export function resolveAfricasTalkingApiBaseUrl({
  username,
  apiBaseUrl
} = {}) {
  void username;

  if (isNonEmptyString(apiBaseUrl)) {
    return apiBaseUrl.trim().replace(/\/$/, "");
  }

  return "https://api.africastalking.com";
}

export function buildAfricasTalkingSmsRequestBody({
  username,
  to,
  message,
  from,
  enqueue = false
}) {
  if (!isNonEmptyString(username)) {
    throw new Error("Africa's Talking username is required.");
  }

  if (!isNonEmptyString(message)) {
    throw new Error("SMS message text is required.");
  }

  const recipients = normalizeRecipientList(to);
  const body = new URLSearchParams();

  body.set("username", username.trim());
  body.set("to", recipients.join(","));
  body.set("message", message.trim());

  if (isNonEmptyString(from)) {
    body.set("from", from.trim());
  }

  if (enqueue) {
    body.set("enqueue", "1");
  }

  return body;
}

function parseRecipient(recipient = {}) {
  return {
    cost: recipient.cost ?? null,
    messageId: recipient.messageId ?? null,
    messageParts: recipient.messageParts ?? null,
    number: recipient.number ?? null,
    status: recipient.status ?? null,
    statusCode: recipient.statusCode ?? null
  };
}

export function mapAfricasTalkingSmsResponse(payload = {}) {
  const smsMessageData = payload?.SMSMessageData ?? {};
  const recipients = Array.isArray(smsMessageData.Recipients)
    ? smsMessageData.Recipients.map(parseRecipient)
    : [];

  return {
    provider: "africas-talking",
    raw: payload,
    summary: smsMessageData.Message ?? null,
    recipients,
    ok: recipients.length > 0 && recipients.every((recipient) =>
      String(recipient.status ?? "").toLowerCase() === "success"
    )
  };
}

export async function sendAfricasTalkingSms({
  username,
  apiKey,
  to,
  message,
  from,
  enqueue = false,
  apiBaseUrl
}) {
  if (!isNonEmptyString(apiKey)) {
    throw new Error("Africa's Talking API key is required.");
  }

  const normalizedTo = normalizeRecipientList(to);
  const sdk = AfricasTalking({
    apiKey: apiKey.trim(),
    username: username.trim()
  });
  const sms = sdk.SMS;
  const options = {
    to: normalizedTo,
    message: message.trim()
  };

  if (isNonEmptyString(from)) {
    options.from = from.trim();
  }

  if (enqueue) {
    options.enqueue = true;
  }

  let payload = null;

  try {
    payload = await sms.send(options);
  } catch (error) {
    const wrappedError = new Error(
      error?.message || "Africa's Talking SMS request failed."
    );
    wrappedError.payload = error?.response?.data ?? error?.response ?? null;
    wrappedError.status = error?.statusCode ?? error?.response?.status ?? null;
    throw wrappedError;
  }

  const baseUrl = resolveAfricasTalkingApiBaseUrl({ username, apiBaseUrl });

  return {
    ...mapAfricasTalkingSmsResponse(payload),
    httpStatus: 200,
    request: {
      username: username.trim(),
      to: normalizedTo,
      from: isNonEmptyString(from) ? from.trim() : null,
      enqueue: Boolean(enqueue),
      apiBaseUrl: baseUrl
    }
  };
}
