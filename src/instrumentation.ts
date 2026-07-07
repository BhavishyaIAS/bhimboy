// Runs once at server startup. If the host environment routes outbound
// traffic through an HTTP(S) proxy (HTTPS_PROXY/HTTP_PROXY set), make
// Node's fetch respect it — Node doesn't honour those env vars by default.
// No-op on Vercel and any environment without proxy vars.
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    (process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
  ) {
    const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
}
