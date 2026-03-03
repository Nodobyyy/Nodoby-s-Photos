export function getVisitorToken() {
  if (typeof window === "undefined") return null

  let token = localStorage.getItem("visitor_token")

  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem("visitor_token", token)
  }

  return token
}