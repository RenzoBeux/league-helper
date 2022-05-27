import { Card, Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
// import { ipcRenderer } from 'electron';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BANS } from '../utils/constants';
import { IChamp } from 'renderer/interfaces/IChamp';
import { useAppDispatch, useAppSelector } from 'renderer/state/hooks';
import { setBans } from 'renderer/state/slices/preferencesSlice';

const Bans = () => {
  const bans = useAppSelector((state) => state.preferences.bans);
  const dispatch = useAppDispatch();

  // save an item
  const addItem = (item: IChamp) => {
    let aux = [...bans];
    console.log(aux);
    if (aux.some((ban: IChamp) => ban.id === item.id)) {
      return;
    }
    aux.push(item);
    dispatch(setBans(aux));
  };

  useEffect(() => {});

  const renderChamp: ItemRenderer<IChamp> = (
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
    aux = aux.filter((ban: IChamp) => ban.id !== id);
    dispatch(setBans(aux));
  };

  const ChampSelect = Select.ofType<IChamp>();
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
          items={[
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
          ]}
          itemRenderer={renderChamp}
          onItemSelect={addItem}
        >
          <Button>Seleccionar campeón</Button>
        </ChampSelect>
      </Card>
      {bans &&
        bans.map((ban: IChamp) => {
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
