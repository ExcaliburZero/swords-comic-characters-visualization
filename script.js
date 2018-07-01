function main(config) {
    $("#" + config.container).width(config.width - (config.displayWidth - 5));
    $("#" + config.container).height(config.height);

    $(display).width(config.displayWidth);
    $(display).height(config.height);
    $(display).css({
        position: "absolute",
        top: "0px",
        right: "0px",
        background: "#cccccc",
    });

    d3.csv(config.dataFile, data => {
        const edges = getCharacterEdges(data);

        let count = 0;
        const nodes = _(edges)
            .map(row => row.characters)
            .flatten()
            .uniq()
            .map(name => {
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
        const options = {};
        const network = new vis.Network(container, nodesAndEdges, options);

        network.on("selectNode", info => {
            const nodeId = info.nodes[0];
            const node = nodes[nodeId];

            displayCharacter(node, config.display)
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

function displayCharacter(character, displayId) {
    const display = $(displayId);

    display.html(
        "<h3 class=\"display-title\">" + character.label + "</h3>" +
        "<img class=\"display-image\" src=\"" + character.image + "\">"
    );

    console.log(character);
}

const config = {
    dataFile: "Swords Comic - Appearances.csv",
    container: "characterGraph",
    display: "#display",
    height: $(document).height() - 20,
    width: $(document).width() - 20,
    displayWidth: 300,
};
main(config);
