import node from "rollup-plugin-node-resolve";

export default {
        entry: "src/lain.js",
        format: "es",
        moduleName: "lain",
        plugins: [node()],
        dest: "dist/lain.js"
};
