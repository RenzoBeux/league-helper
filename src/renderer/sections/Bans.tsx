import { Card, Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
// import { ipcRenderer } from 'electron';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BANS } from '../../common/constants';
import { useAppDispatch, useAppSelector } from 'renderer/state/hooks';
import { setBans } from 'renderer/state/slices/preferencesSlice';
import { Champion } from 'common/Champion';

const Bans = () => {
  const bans = useAppSelector((state) => state.preferences.bans);
  const dispatch = useAppDispatch();

  // save an item
  const addItem = (item: Champion) => {
    let aux = [...bans];
    console.log(aux);
    if (aux.some((ban: Champion) => ban.id === item.id)) {
      return;
    }
    aux.push(item);
    dispatch(setBans(aux));
  };

  useEffect(() => {});

  const renderChamp: ItemRenderer<Champion> = (
    champ,
    { handleClick, modifiers, query }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    const text = `${champ.name}`;
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        label={champ.name}
        key={champ.id}
        onClick={handleClick}
      />
    );
  };

  const handleSaveButton = () => {
    console.log(bans);
    window.electron.store.set(BANS, bans);
  };

  const handleClearButton = () => {
    // appActions.setBans([]);
    window.electron.store.set(BANS, []);
  };
  const handleDelete = (id: number) => {
    let aux = [...bans];
    aux = aux.filter((ban: Champion) => ban.id !== id);
    dispatch(setBans(aux));
  };

  const ChampSelect = Select.ofType<Champion>();
  const navigate = useNavigate();
  return (
    <div className="bans">
      <h1>Bans</h1>
      <button
        onClick={() => {
          navigate('/', { replace: true });
        }}
      >
        HOLAAA
      </button>
      <Card>
        <h4>HOLA!</h4>
        <ChampSelect
          items={[]}
          itemRenderer={renderChamp}
          onItemSelect={addItem}
        >
          <Button>Seleccionar campeón</Button>
        </ChampSelect>
      </Card>
      {bans &&
        bans.map((ban: Champion) => {
          return (
            <Card key={ban.id}>
              {ban.name}
              <Button onClick={() => handleDelete(ban.id)}>X</Button>
            </Card>
          );
        })}

      <Button onClick={handleSaveButton}> Guardar </Button>
      <Button onClick={handleClearButton}> Limpiar </Button>
    </div>
  );
};

export default Bans;
