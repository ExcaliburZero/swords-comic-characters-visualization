"use strict";

/**
 * Creates the data visualization using the given configuration settings.
 *
 * @param {object} config - The configuration settings to use.
 */
async function main(config) {
    setupVisualizationStructure(config);

    const [appearances, characters, comicsTable] =
        await Promise.all([
            d3.csv(config.appearancesFile),
            d3.csv(config.charactersFile),
            d3.csv(config.comicsFile),
        ]);

    const edges = getCharacterEdges(appearances);

    const { charactersTable, nodes, edgeObjects } =
        getNodesAndEdges(characters, edges);

    const network = createNetwork(config, edges, comicsTable,
        charactersTable, nodes, edgeObjects);

    activateSearchBar(config, characters, edges, comicsTable,
        network);
}

/**
 * Sets up the properties of the visualization elements.
 *
 * @param {object} config - The configuration settings to use.
 */
function setupVisualizationStructure(config) {
    $("#" + config.container).width(config.width - (config.displayWidth - 5));
    $("#" + config.container).height(config.height);

    $("#searchBar").width(config.width - (config.displayWidth + 50));

    $("#" + config.progressBar).text("Loading ... " + "0%");

    $("#" + config.display).width(config.displayWidth);
    $("#" + config.display).height(config.height);
    $("#" + config.display).css({
        position: "absolute",
        top: "0px",
        right: "0px",
        background: "#cccccc",
    });
    $("#" + config.display)
        .append("<div id=\"" + config.display + "Contents\"></div>");

    $("#" + config.display + "Contents").width(config.displayWidth - 20);
    $("#" + config.display + "Contents").height(config.height - 20);
    $("#" + config.display + "Contents").css({
        "overflow-y": "auto",
        "overflow-x": "hidden",
    });
}

/**
 * Returns a list of edges between characters that appeard in the same comic.
 * Each edges is represented by an object containing the number of the comic
 * and the list of the two characters (in alphabetical order).
 *
 * @param {array} data - The character appearance data to use for creating the
 *     edges.
 * @return {array} - A list of the character co-appearance edges.
 */
function getCharacterEdges(data) {
    const edges = [];

    const byComic = _.groupBy(data, row => row.Comic);

    for (const comic in byComic) {
        if (byComic.hasOwnProperty(comic)) {
            const characters = byComic[comic];

            for (let i = 0; i < characters.length; i++) {
                for (let j = i + 1; j < characters.length; j++) {
                    const charA = characters[i].Character;
                    const charB = characters[j].Character;

                    // Sort them so that direction doesn't matter
                    const sorted = [charA, charB].sort();

                    edges.push({
                        comic: comic,
                        characters: sorted,
                    });
                }
            }
        }
    }

    return edges;
}

/**
 * Creates the node and edge objects to use in the network. Also creates a
 * character lookup table.
 *
 * @param {array} characters - The character information.
 * @param {array} edges - The character co-appearance information.
 * @return {object} - An object containing the nodes, edges, and character
 *     lookup table.
 */
function getNodesAndEdges(characters, edges) {
    let count = 0;
    const charactersTable = [];
    const nodes = _(edges)
        .map(row => row.characters)
        .flatten()
        .uniq()
        .map(name => {
            charactersTable.push(
                _.filter(characters, r => r.Character === name)[0]
            );

            charactersTable[count].id = count;
            charactersTable[count].appearances =_(edges)
                    .filter(r => r.characters.includes(name))
                    .map(r => r.comic)
                    .uniq()
                    .value()
                    .join(", ");

            return {
                id: (count++),
                label: name,
                image: "img/" + name + ".png",
                shape: "image",
            };
        })
        .value();

    const getId = name =>
        _.filter(nodes, n => n.label === name)[0].id;

    const edgeObjects = _(edges)
        .uniqBy(row => "" + row.characters)
        .map(row => {
            return {
                from: getId(row.characters[0]),
                to: getId(row.characters[1]),
                value: _.filter(
                    edges,
                    r => _.isEqual(r.characters, row.characters)
                ).length,
            };
        })
        .value();

    return {
        charactersTable: charactersTable,
        nodes: nodes,
        edgeObjects: edgeObjects,
    };
}

function createNetwork(config, edges, comicsTable, charactersTable, nodes,
    edgeObjects) {
    const container = document.getElementById(config.container);
    const nodesAndEdges = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edgeObjects),
    };

    const options = {
        nodes: {
            borderWidth: 1,
            borderWidthSelected: 20,
            color: {
                border: "#2B7CE9",
                highlight: "#2B7CE9",
            },
            shapeProperties: {
                useBorderWithImage: true,
            },
        },
        edges: {
            selectionWidth: (width) => width + 10,
            color: {
                color: "#2B7CE9",
                highlight: "#2ecc71",
            },
        },
        physics: {
            stabilization: {
                enabled: true,
                iterations: 300,
                updateInterval: 10,
            },
        },
    };
    const network = new vis.Network(container, nodesAndEdges,
        options);

    network.on("selectNode", info => {
        const nodeId = info.nodes[0];
        const character = charactersTable[nodeId];

        displayCharacter(edges, character, comicsTable,
            config.display);
    });


    network.on("stabilizationProgress", function(params) {
        const percent = (params.iterations / params.total) * 100;
        const percentInt = ("" + percent).split(".")[0];

        $("#" + config.progressBar)
            .text("Loading ... " + percentInt + "%");
    });
    network.once("stabilizationIterationsDone", function() {
        $("#" + config.progressBar).css({
            display: "none",
        });
        network.setOptions({ physics: false });
    });

    return network;
}

/**
 * Sets the search bar to work with the visualization.
 *
 * @param {object} config - The configuration settings to use.
 * @param {array} characters - The character information.
 * @param {array} edges - The character co-appearance information.
 * @param {array} comicsTable - An array with information on the different
 *     comics.
 */
function activateSearchBar(config, characters, edges, comicsTable, network) {
    $(config.searchBar)
        .search({
            source: characters.map(r => {
                // Combine the character's name with their alternate names to
                // make searching for them easier
                r.title = r.Character;

                const alternateNames =
                    r["Alternate Names"].split(",");

                if (alternateNames[0] !== "") {
                    alternateNames.map(alt => {
                        r.title += " / " + alt;
                    });
                }

                return r;
            }),
            onSelect: character => {
                // Show the selected character in the display window and on the
                // network
                const nodeId = character.id;

                displayCharacter(edges, character, comicsTable,
                    config.display);

                network.setSelection({
                    nodes: [nodeId],
                    edges: [],
                });
            },
        });
}

/**
 * Returns the link to the specified comic using the given comic info table.
 *
 * @param {array} comicsTable - An array with information on the different
 *     comics.
 * @param {string} comic - The comic to get the link to.
 * @return {string} - The url to the specified comic.
 */
function getComicLink(comicsTable, comic) {
    return _.filter(comicsTable, c => c.Comic === comic)[0].Link;
}

/**
 * Returns an HTML representation of the comics that the given character
 * appeared in.
 *
 * @param {object} character - The character to get the appearance information
 *     of.
 * @param {array} comicsTable - An array with information on the different
 *     comics.
 * @return {string} - An HTML representation of the character's appearances.
 */
function getAppearancesHTML(character, comicsTable) {
    return "<h4>Appearances</h4>" + "<p>" +
        character.appearances.split(",").map(comic =>
            "<a href=\""+ getComicLink(comicsTable, comic.trim()) + "\">" +
            comic.trim() + "</a>"
        ).join(", ") +
        "</p>";
}

/**
 * Returns an HTML representation of the characters that the given character
 * appeared with.
 *
 * @param {array} edges - The character co-appearance information.
 * @param {object} character - The character to get the costar information of.
 * @param {array} comicsTable - An array with information on the different
 *     comics.
 * @return {string} - An HTML representation of the character's costars.
 */
function getAppearedWithHTML(edges, character, comicsTable) {
    const costars = _(edges)
        .filter(e => e.characters.includes(character.Character))
        .map(e => {
            const chars = e.characters;
            const name = (chars[0] === character.Character)
                ? chars[1] : chars[0];

            return {
                character: name,
                comic: e.comic,
            };
        })
        .groupBy(e => e.character)
        .map(e => {
            return {
                character: e[0].character,
                comics: e.map(a => a.comic),
                occurances: e.length,
                negOccurances: -e.length,
            };
        })
        .sortBy(["negOccurances", "character"])
        .value();

    return "<h4>Appeared With</h4>" +
        costars.map(e =>
            "<p>" + e.character + " (" + e.comics.map(c =>
                "<a href=\""+ getComicLink(comicsTable, c) + "\">" + c + "</a>"
            ).join(", ") + ")" + "</p>"
        ).join("");
}

/**
 * Returns an HTML representation of the alternate titles that the given
 * character has.
 *
 * @param {object} character - The character to get the alternate titles of.
 * @return {string} - An HTML representation of the character's alternate
 *     titles.
 */
function getAlternateTitlesHTML(character) {
    const alternates =
        _.filter(character["Alternate Names"].split(","), r => r !== "").concat(
            _.filter(
                character["Alternate Appearances"].split(","),
                r => r !== ""
            )
        );

    return (alternates.length === 0)
        ? ""
        : "<h4>Alternate Names / Appearances</h4>" +
            alternates.map(name =>
                "<p>" + name + "</p><img class=\"display-image\" src=\"" +
                "img/" + name + ".png" + "\">"
            ).join("");
}

/**
 * Displays information on the specified character in the given display.
 *
 * @param {array} edges - The character co-appearance information.
 * @param {object} character - The character to display information about.
 * @param {array} comicsTable - The information on the different comics.
 * @param {string} displayId - The id of the display to put the information in.
 */
function displayCharacter(edges, character, comicsTable, displayId) {
    const display = $("#" + displayId + "Contents");

    const name =
        "<h3 class=\"display-title\">" + character.Character + "</h3>";

    const image = "<img class=\"display-image\" src=\"" +
        "img/" + character.Character + ".png" + "\">";

    const appearances = getAppearancesHTML(character, comicsTable);
    const alternateTitles = getAlternateTitlesHTML(character);
    const appearedWith = getAppearedWithHTML(edges, character, comicsTable);

    display.html(
        name +
        image +
        appearances +
        alternateTitles +
        appearedWith
    );
}

const config = {
    appearancesFile: "Swords Comic - Appearances.csv",
    charactersFile: "Swords Comic - Characters.csv",
    comicsFile: "Swords Comic - Comics.csv",
    container: "characterGraph",
    display: "display",
    progressBar: "progressBar",
    searchBar: ".ui.search",
    height: $(document).height() - 40,
    width: $(document).width() - 20,
    displayWidth: 300,
};
main(config);
