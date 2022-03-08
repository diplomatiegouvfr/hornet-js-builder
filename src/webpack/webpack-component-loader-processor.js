module.exports = WebPackComponentTransformer;
const path = require("path");
const loaderUtils = require("loader-utils");
const helper = require("../helpers");

function WebPackComponentTransformer(content) {
    this.cacheable();

    const query = loaderUtils.parseQuery(this.query);
    const currentFilePath = this.resourcePath;
    // On gère le cas où le fichier ne contient pas le texte, dans ce cas pas de modification
    if (content.indexOf(query.replaceText) === -1) {
        helper.debug("[webpack]: Ignore du fichier ", currentFilePath);
        return content;
    }

    helper.debug("[webpack]: Conf de WebPackComponentTransformer: ", query);

    const newLine = "\r\n";
    let addContent = `// [AUTO GENERATED] DO NOT EDIT THIS FUNCTION DIRECTLY${newLine}`;
    let firstIf = true;

    const currentFileDir = path.dirname(currentFilePath);
    helper.debug("[webpack]: currentFilePath: ", currentFilePath);
    helper.debug("[webpack]: currentFileDir: ", currentFileDir);

    const sourcesDirs = [];
    let sourcesDir;
    helper.debug("[webpack]: query.sourcesDirs: ", query.sourcesDirs);

    query.sourcesDirs.forEach((pathElt) => {
        sourcesDirs.push(path.join(path.resolve(currentFileDir, pathElt), path.sep));
    });

    helper.debug("[webpack]: sourcesDirs: ", sourcesDirs);

    /**
     * Fonction gérant l'ajout des composants dans la conf webpack
     */
    function handleFile(dir, file) {
        if (helper.endsWith(file, query.fileSuffix)) {
            const fullName = path.join(dir, file);
            helper.debug("[webpack]: Adding:", fullName);

            const extension = path.extname(fullName);
            // helper.debug('File extension:', extension);

            let fileToImport = path.relative(currentFileDir, fullName).replace(/\\/g, "/");
            if (!helper.startsWith(fileToImport, ".")) {
                fileToImport = `./${fileToImport}`;
            }
            helper.debug("[webpack]: Relative fileToImport:", fileToImport);

            const chunkName = fullName.replace(sourcesDir, "").replace(extension, "").replace(/\\/g, "/");
            helper.debug("[webpack]: chunkName:", chunkName);

            const tab = ["if (name === '", chunkName, `') { ${newLine}`, "require(['", fileToImport, `'], callback);${newLine}`, "}", newLine];

            if (firstIf) {
                firstIf = false;
            } else {
                tab.splice(0, 0, "else ");
            }

            addContent += tab.join("");
        } else {
            // console.log('Skipping: ' + dir + file);
        }
    }

    sourcesDirs.forEach((elt) => {
        sourcesDir = elt;

        helper.readDirRecursive(sourcesDir, handleFile);
    });

    if (firstIf) {
        helper.warn("Aucun fichier de type  ", query.fileSuffix, " présent dans le dossier ", sourcesDir);
        addContent = "callback('ERROR: No File with name \\''+name+'\\' found');";
    } else {
        addContent += "else{callback('ERROR: No File with name \\''+name+'\\' found');}";
    }

    return content.replace(query.replaceText, addContent);
}
