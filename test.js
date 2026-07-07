const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="home-files-grid"></div></body></html>`);
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.window.electronAPI = {
    getStorageInfo: async () => ({ used: 100, total: 1000 }),
    getFiles: async () => []
};

try {
    require("./src/renderer.js");
    const event = new dom.window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    console.log("No errors!");
} catch (e) {
    console.error("Error:", e);
}
