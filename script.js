function main(config) {
    $("#" + config.container).width(config.width);
    $("#" + config.container).height(config.height);

    d3.csv(config.dataFile, data => {
        const edges = getCharacterEdges(data);

        let count = 0;
        const nodes = _(edges)
            .flatten()
            .uniq()
            .map(name => {
                return {
                    id: (count++),
                    label: name,
                    image: "img/" + name + ".png",
                    shape: "image",
                    value: _.filter(edges, r => r.includes(name)).length,
                };
            })
            .value();

        const getId = (name) => _.filter(nodes, n => n.label === name)[0].id;
        const edgeObjects = _(edges)
            .uniqBy(row => "" + row)
            .map(row => {
                return {
                    from: getId(row[0]),
                    to: getId(row[1]),
                    value: _.filter(edges, r => _.isEqual(r, row)).length,
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

                edges.push(sorted);
            }
        }
    }

    return edges;
}

const config = {
    dataFile: "Swords Comic - Appearances.csv",
    container: "characterGraph",
    height: $(document).height() - 20,
    width: $(document).width() - 20,
};
main(config);
