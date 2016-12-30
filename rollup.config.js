import node from "rollup-plugin-node-resolve";

export default {
        entry: "src/lain.js",
        format: "umd",
        moduleName: "lain",
        plugins: [node()],
        dest: "dist/lain.js"
};
