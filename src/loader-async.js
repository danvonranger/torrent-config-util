
const path = require('path');
const file = path.resolve(__dirname, '../data.xml');
const fetch = require('node-fetch');

const fs = require('fs');
const xml2js = require('xml2js');

const baseUrl = 'http://localhost:8001/api';
const addUri = '/add';
const seriesUri = '/series';
const updateUri = '/update';
const seasonsUri = '/seasons/';

const run = async () => {
    console.time("series-update");
    const serviceSeries = await getSeriesFromWebService();
    const xmlSeries = loadXmlData(file);
    for (let xmlItem of xmlSeries) {
        const seriesId = await getId(xmlItem.name, serviceSeries);
        const seasonsFromService = await getSeasonsFromService(seriesId.id);
        for (let season of xmlItem.seasons) {
            const newSeason = season.split('-')[0];
            const newEpisode = season.split('-')[1];
            if (canUpdate(newSeason, newEpisode, seasonsFromService)) {
                console.log(`Sending server update for: ${seriesId.id} S${newSeason} E${newEpisode}`);
                const res = await updateService(seriesId.id, newSeason, newEpisode);
            }
        }
    }
    console.timeEnd("series-update");
}

const updateService = async (id, season, episode) => {
    const body = { id: id, season: season, episode };
    return await fetch(baseUrl + updateUri, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

const canUpdate = (season, episode, seasonsFromService) => {
    let goodToGo = true;
    for (let item of seasonsFromService) {
        if (item.season === season && item.episode === episode) {
            goodToGo = false;
            break;
        }

    }
    return goodToGo;
}

const getSeasonsFromService = async (id) => {
    const url = baseUrl + seasonsUri + id;
    const res = await fetch(url);
    return await res.json();
}

const getId = async (name, serviceSeries) => {
    let id = {};
    for (let item of serviceSeries) {
        if (item.name === name) {
            id = { id: item.id };
            break;
        }
    }

    if (!id.id) {
        const body = { name: name };
        const res = await fetch(baseUrl + addUri, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        });
        const asJson = await res.json();
        id = { id: asJson.id };
    }

    return id;
}

const loadXmlData = (xmlFile) => {
    const parser = new xml2js.Parser();
    const data = fs.readFileSync(xmlFile);
    let output = [];
    parser.parseString(data, function (err, result) {
        for (let item of result['tvseries']['series']) {
            const name = item['$']['name'];
            let series = { name: name, seasons: [] };
            const episodes = item['episodes'][0].split(',');
            for (let item of episodes) {
                series.seasons.push(item);
            }
            output.push(series);
        }
    });
    return output;
}

const getSeriesFromWebService = async () => {
    const res = await fetch(baseUrl + seriesUri);
    return await res.json();
}

module.exports = {
    run
}