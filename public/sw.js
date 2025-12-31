self.addEventListener("install", () => {
  console.log("FRAGE PWA installed");
});

self.addEventListener("activate", () => {
  console.log("FRAGE PWA activated");
});

self.addEventListener("fetch", () => {});
