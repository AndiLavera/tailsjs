import { decode, StringReader } from "../std.ts";
import type {
  APIGatewayProxyEventV2,
  LambdaContext,
  ServerRequest,
  ServerResponse,
  ServerType,
} from "../deps.ts";

// deno-lint-ignore no-explicit-any
const isReader = (value: any): value is Deno.Reader =>
  value &&
  typeof value === "object" &&
  "read" in value &&
  typeof value.read === "function";

const eventBody = (event: APIGatewayProxyEventV2): string =>
  event.isBase64Encoded ? window.atob(event.body || "") : event.body || "";

const eventUrl = (event: APIGatewayProxyEventV2): string => {
  if (event.queryStringParameters) {
    return `${event.rawPath}?${
      Object.keys(event.queryStringParameters)
        .map((k) => `${k}=${event.queryStringParameters![k]}`)
        .join("&")
    }`;
  }
  return event.rawPath;
};

export const serverRequest = (
  event: APIGatewayProxyEventV2,
  context: LambdaContext,
): ServerRequest => {
  const headers = new Headers(event.headers);
  const url = eventUrl(event);
  const body = <Deno.Reader> new StringReader(event.body ?? "");

  if (event.body && !headers.get("Content-Length")) {
    const body = eventBody(event);
    headers.set("Content-Length", decode(body).byteLength.toString());
  }

  const clonedEvent = JSON.parse(JSON.stringify(event));
  delete clonedEvent.body;

  headers.set("x-apigateway-event", JSON.stringify(clonedEvent));
  headers.set("x-apigateway-context", JSON.stringify(context));

  return {
    method: event.requestContext.http.method,
    url,
    headers,
    body,
  } as ServerRequest;
};

export const apiGatewayResponse = async (response?: ServerResponse) => {
  if (!response) {
    return { statusCode: 500 };
  }

  if (!response.body) {
    return response;
  }

  let arrayBuf;
  if (isReader(response.body)) {
    const buf = new Uint8Array(1024);
    const n = <number> await response.body.read(buf);
    arrayBuf = buf.subarray(0, n);
  } else {
    arrayBuf = response.body;
  }

  const rawHeaders: { [key: string]: string } = {};
  response.headers.forEach((v, k) => (rawHeaders[k] = v));

  return await {
    statusCode: response.status,
    body: new TextDecoder().decode(arrayBuf).trim(),
    headers: rawHeaders,
  };
};

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: LambdaContext,
  app: ServerType,
) => {
  const request = serverRequest(event, context);
  const response = await app.handle(request);
  return apiGatewayResponse(response);
};
