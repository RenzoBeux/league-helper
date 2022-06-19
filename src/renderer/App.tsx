import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';

import React, { useEffect } from 'react';
import './App.css';

import { HashRouter, Link, Route, Routes } from 'react-router-dom';

import Champion from 'api/entities/Champion';
import { ChampionsMessage } from 'api/MessageTypes/InitialMessage';
import { Desktop } from './sections/Desktop';
import Bans from './sections/Bans';
import {
    BANS,
    HANDLE_FETCH_DATA,
    HANDLE_SAVE_DATA,
    PICKS,
    RAWCHAPIONS,
    SUMMONER,
} from '../common/constants';
import { useAppDispatch } from './state/hooks';
import { setBans, setPicks } from './state/slices/preferencesSlice';
import Picks from './sections/Picks';
import { setChampions } from './state/slices/dataSlice';

function App() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const bans: Array<Champion> = window.electron.store.get(BANS) || [];
        const picks: Array<Champion> = window.electron.store.get(PICKS) || [];
        dispatch(setBans(bans));
        dispatch(setPicks(picks));
    }, []);

    window.electron.ipcRenderer.on('connect', (event, data) => {
        // dispatch(setChampions(event.message.champions));
        console.log(event);
    });

    window.electron.ipcRenderer.on(SUMMONER, (event, data) => {
        console.log(event);
    });

    window.electron.ipcRenderer.on(RAWCHAPIONS, (event, data) => {
        console.log(event);
        dispatch(setChampions((event as ChampionsMessage).champions));
    });

    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Desktop />} />
                <Route path="/bans" element={<Bans />} />
                <Route path="/picks" element={<Picks />} />
            </Routes>
        </HashRouter>
    );
}

export default App;
