const publicApi = (
  process.env.PUBLIC_API_ORIGIN || "http://127.0.0.1:8012"
).replace(/\/+$/, "");
const privateApi = (
  process.env.PRIVATE_API_ORIGIN || "http://127.0.0.1:8010"
).replace(/\/+$/, "");
export default {
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    const guest = [
      {
        source: "/api/menu/:table",
        destination: publicApi + "/api/menu/:table",
      },
      {
        source: "/api/images/:branch/:image",
        destination: publicApi + "/api/images/:branch/:image",
      },
    ];
    if (process.env.WORKSPACE_MODE === "private")
      guest.push({
        source: "/api/branches/:path*",
        destination: privateApi + "/api/branches/:path*",
      });
    return guest;
  },
};
