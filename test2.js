const fs = require('fs');
let content = fs.readFileSync('src/renderer.js', 'utf8');

// Mock DOM
const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="home-files-grid"></div><div id="breadcrumbs"></div></body></html>`);
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.window.electronAPI = {
    getStorageInfo: async () => ({ used: 100, total: 1000 }),
    getFiles: async () => []
};

// Remove event listener wrappings to just execute the code
content = content.replace("document.addEventListener('DOMContentLoaded', () => {", "");
content = content.replace(/}\);\s*$/, "");

// Stub all DOM elements that might be missing
content = `
document.getElementById = function(id) {
    let el = dom.window.document.getElementById(id);
    if (!el) {
        el = dom.window.document.createElement('div');
        el.id = id;
        dom.window.document.body.appendChild(el);
    }
    return el;
};
document.querySelector = function(sel) {
    let el = dom.window.document.querySelector(sel);
    if (!el) {
        el = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(el);
    }
    return el;
};
` + content;

fs.writeFileSync('test_scope2.js', content);
