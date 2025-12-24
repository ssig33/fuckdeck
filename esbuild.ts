import { createServer } from "esbuild-server";
import esbuild from "esbuild";

const mode = process.argv[2] === "--watch" ? "watch" : "build";

const esbuildOptions = {
  entryPoints: ["src/index.tsx"],
  bundle: true,
  sourcemap: true,
  outdir: "public",
  logLevel: "info",
  jsx: "automatic",
} as any;

if (mode === "watch") {
  const port = parseInt(process.env.PORT || "8080");
  console.log(`Development server started at http://localhost:${port}`);
  createServer(
    { ...esbuildOptions },
    { static: "public", historyApiFallback: true, port },
  ).start();
} else {
  const main = async () => {
    const buildContext = await esbuild.context(esbuildOptions);
    await buildContext.rebuild();
    console.log("Build completed.");
    await buildContext.dispose();
  };
  main();
}
