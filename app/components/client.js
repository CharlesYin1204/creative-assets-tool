export async function request(route, body, method) {
  const res = await fetch("/api/" + route, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok)
    throw Object.assign(new Error(data.error || "操作失败"), {
      status: res.status,
    });
  return data;
}
