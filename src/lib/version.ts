const rawVersion = import.meta.env.VITE_BUILD_VERSION;

const version = typeof rawVersion === "string" && rawVersion.trim()
  ? rawVersion.trim()
  : "local";

export { version };
