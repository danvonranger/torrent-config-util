
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

let serviceSeries = {};
let xmlSeries = [];
const BreakException = {};

const run = () => {
    getSeriesFromWebService()
        .then(() => {
            loadXmlData(file);
            xmlSeries.forEach(function (xmlItem, index) {
                getId(xmlItem.name).then((i) => {
                    getSeasonsFromService(i.id)
                        .then((seasonsFromService) => {
                            xmlItem.seasons.forEach(function (xi) {
                                const newSeason = xi.split('-')[0];
                                const newEpisode = xi.split('-')[1];
                                if (canUpdate(newSeason, newEpisode, seasonsFromService)) {
                                    console.log(`Sending server update for: ${i.id} S${newSeason} E${newEpisode}`);
                                    updateService(i.id, newSeason, newEpisode);
                                }
                            });
                        });
                });
            });
        });
}

const updateService = (id, season, episode) => {
    const body = { id: id, season: season, episode };
    return fetch(baseUrl + updateUri, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

const canUpdate = (season, episode, seasonsFromService) => {
    let goodToGo = true;
    try {
        seasonsFromService.forEach(function (item) {
            if (item.season === season && item.episode === episode) {
                goodToGo = false;
                throw BreakException;
            }
        });
    } catch (e) {
        if (e !== BreakException) throw e;
    }
    return goodToGo;
}

const getSeasonsFromService = (id) => {
    const url = baseUrl + seasonsUri + id;
    return fetch(url)
        .then(res => res.json())
        .then(s => {
            return s;
        });
}

const getId = (name) => {
    let id = {};
    try {
        serviceSeries.forEach(function (item) {
            if (item.name === name) {
                id = { id: item.id };
                throw BreakException;
            }
        });
    } catch (e) {
        if (e !== BreakException) throw e;
    }
    
    if (!id.id) {
        const body = { name: name };
        return fetch(baseUrl + addUri, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        }).then(res => res.json())
            .then(series => {
                return { id: series.id };
            });
    } else {
        return new Promise(function (resolve, reject) {
            resolve(id);
        }).then((x) => {
            return x;
        });
    }
}

const loadXmlData = (xmlFile) => {
    const parser = new xml2js.Parser();
    const data = fs.readFileSync(xmlFile);
    parser.parseString(data, function (err, result) {
        result['tvseries']['series'].forEach(function (item, index) {
            const name = item['$']['name'];
            let series = { name: name, seasons: [] };
            const episodes = item['episodes'][0].split(',');
            episodes.forEach(function (item, index) {
                series.seasons.push(item);
            });
            xmlSeries.push(series);
        });
    });
}

const getSeriesFromWebService = () => {
    return fetch(baseUrl + seriesUri)
        .then(res => res.json())
        .then(s => {
            serviceSeries = s;
        });
}

module.exports = {
    run
}