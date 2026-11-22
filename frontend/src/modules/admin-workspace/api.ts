export const apiBase = "/api";
export async function api(path: string, method = "GET", data?: unknown) {
  const form = data instanceof FormData;
  const response = await fetch(apiBase + path, {
    method,
    headers: {
      ...(!form ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? (form ? (data as FormData) : JSON.stringify(data)) : undefined,
    cache: "no-store",
  });
  if (response.status === 413)
    throw Error("Upload exceeds the server limit. Try fewer or smaller pages.");
  const context = `Menu API ${method} ${path.split("?")[0]} returned HTTP ${response.status}`;
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw Error(`${context}. Check the API address and deployment logs.`);
  const result = await response.json();
  if (!response.ok) {
    if (typeof result?.detail === "string") throw Error(result.detail);
    const code = result?.error?.code ?? result?.code;
    const label =
      typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(code)
        ? ` (${code})`
        : "";
    throw Error(`${context}${label}.`);
  }
  return result;
}

export function photoUrl(photo: string, privatePreview = false) {
  if (!photo) return "";
  if (privatePreview) {
    const [, , branch, id] = photo.split("/");
    return apiBase + "/branches/" + branch + "/photos/" + id;
  }
  return apiBase + photo;
}
