import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';

import React, { useEffect } from 'react';
import './App.css';

import { HashRouter, Link, Route, Routes } from 'react-router-dom';

import { Desktop } from './sections/Desktop';
import Bans from './sections/Bans';
import {
  BANS,
  HANDLE_FETCH_DATA,
  HANDLE_SAVE_DATA,
  PICKS,
} from '../common/constants';
import { useAppDispatch } from './state/hooks';
import { setBans, setPicks } from './state/slices/preferencesSlice';
import Picks from './sections/Picks';
import { Champion } from 'api/entities/Champion';
import { setChampions } from './state/slices/dataSlice';

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let bans: Array<Champion> = window.electron.store.get(BANS) || [];
    let picks: Array<Champion> = window.electron.store.get(PICKS) || [];
    dispatch(setBans(bans));
    dispatch(setPicks(picks));
  }, []);

  window.electron.ipcRenderer.on('connect', (event, data) => {
    dispatch(setChampions(event.message.champions));
    console.log(event);
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
