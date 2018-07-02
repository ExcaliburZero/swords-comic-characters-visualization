function main(config) {
    $("#" + config.container).width(config.width - (config.displayWidth - 5));
    $("#" + config.container).height(config.height);

    $("#searchBar").width(config.width - (config.displayWidth + 50));

    $(config.progressBar).text("Loading ... " + "0%");

    $(config.display).width(config.displayWidth);
    $(config.display).height(config.height);
    $(config.display).css({
        position: "absolute",
        top: "0px",
        right: "0px",
        background: "#cccccc",
    });

    d3.csv(config.appearancesFile, appearances => {
        d3.csv(config.charactersFile, characters => {
            d3.csv(config.comicsFile, comicsTable => {
                const edges = getCharacterEdges(appearances);

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
                            //value: _.filter(edges, r => r.includes(name)).length,
                        };
                    })
                    .value();

                const getId = (name) => _.filter(nodes, n => n.label === name)[0].id;
                const edgeObjects = _(edges)
                    .uniqBy(row => "" + row.characters)
                    .map(row => {
                        return {
                            from: getId(row.characters[0]),
                            to: getId(row.characters[1]),
                            value: _.filter(
                                edges, r => _.isEqual(r.characters, row.characters)
                            ).length,
                        };
                    })
                    .value();

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
                        },
                        shapeProperties: {
                            useBorderWithImage: true,
                        },
                    },
                };
                const network = new vis.Network(container, nodesAndEdges, options);

                network.on("selectNode", info => {
                    const nodeId = info.nodes[0];
                    const character = charactersTable[nodeId];

                    displayCharacter(character, comicsTable, config.display)
                });

                $(".ui.search")
                    .search({
                        source: characters.map(r => {
                            r.title = r.Character;

                            const alternateNames =
                                r["Alternate Names"].split(",");

                            if (alternateNames[0] !== "") {
                                alternateNames.map(alt => {
                                    r.title += " / " + alt
                                });
                            }

                            return r;
                        }),
                        onSelect: (character) => {
                            const nodeId = character.id;

                            displayCharacter(character, comicsTable,
                                config.display)

                            network.setSelection({
                                nodes: [nodeId],
                                edges: [],
                            });
                        },
                    });

                network.on("stabilizationProgress", function(params) {
                    const percent = (params.iterations / params.total) * 100;
                    $(config.progressBar).text("Loading ... " + ("" + percent).split(".")[0] + "%");
                });
                network.once("stabilizationIterationsDone", function() {
                    $(config.progressBar).css({
                        display: "none",
                    });
                });
            });
        });
    });
}

function getCharacterEdges(data) {
    const edges = [];

    const byComic = _.groupBy(data, row => row.Comic);

    for (const comic in byComic) {
        const characters = byComic[comic];

        for(let i = 0; i < characters.length; i++) {
            for(let j = i + 1; j < characters.length; j++)  {
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

    return edges;
}

function getComicLink(comicsTable, comic) {
    return _.filter(comicsTable, c => c.Comic === comic)[0].Link;
}

function displayCharacter(character, comicsTable, displayId) {
    const display = $(displayId);

    const appearances = "<h4>Appearances</h4>" + "<p>" +
        character.appearances.split(",").map(comic =>
            "<a href=\""+ getComicLink(comicsTable, comic.trim()) + "\">" + comic.trim() +
            "</a>"
        ).join(", ") +
        "</p>";

    const alternates =
        _.filter(character["Alternate Names"].split(","), r => r !== "").concat(
            _.filter(character["Alternate Appearances"].split(","), r => r !== "")
        );

    const alternateTitles = (alternates.length === 0)
        ? ""
        : "<h4>Alternate Names / Appearances</h4>" +
            alternates.map(name =>
                "<p>" + name + "</p><img class=\"display-image\" src=\"" +
                "img/" + name + ".png" + "\">"
            ).join("");

    display.html(
        "<h3 class=\"display-title\">" + character.Character + "</h3>" +
        "<img class=\"display-image\" src=\"" + "img/" + character.Character + ".png" + "\">" +
        appearances +
        alternateTitles
    );
}

const config = {
    appearancesFile: "Swords Comic - Appearances.csv",
    charactersFile: "Swords Comic - Characters.csv",
    comicsFile: "Swords Comic - Comics.csv",
    container: "characterGraph",
    display: "#display",
    progressBar: "#progressBar",
    height: $(document).height() - 40,
    width: $(document).width() - 20,
    displayWidth: 300,
};
main(config);
