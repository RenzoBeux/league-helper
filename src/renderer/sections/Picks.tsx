import { Card, Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
// import { ipcRenderer } from 'electron';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BANS, PICKS } from '../../common/constants';
import { IChamp } from 'renderer/interfaces/IChamp';
import { useAppDispatch, useAppSelector } from 'renderer/state/hooks';
import { setPicks } from 'renderer/state/slices/preferencesSlice';

const Picks = () => {
  const picks = useAppSelector((state) => state.preferences.picks);
  const dispatch = useAppDispatch();

  // save an item
  const addItem = (item: IChamp) => {
    let aux = [...picks];
    if (aux.some((ban: IChamp) => ban.id === item.id)) {
      return;
    }
    aux.push(item);
    dispatch(setPicks(aux));
  };

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
    console.log(picks);
    window.electron.store.set(PICKS, picks);
  };

  const handleClearButton = () => {
    dispatch(setPicks([]));
    window.electron.store.set(BANS, []);
  };

  const handleDelete = (id: number) => {
    let aux = [...picks];
    aux = aux.filter((pick: IChamp) => pick.id !== id);
    dispatch(setPicks(aux));
  };

  const ChampSelect = Select.ofType<IChamp>();
  const navigate = useNavigate();
  return (
    <div className="picks">
      <h1>Picks</h1>
      <button
        onClick={() => {
          navigate('/', { replace: true });
        }}
      >
        Back
      </button>
      <Card>
        <h4>Select champion</h4>
        <ChampSelect
          items={[
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
          ]}
          itemRenderer={renderChamp}
          onItemSelect={addItem}
        >
          <Button>Select champion</Button>
        </ChampSelect>
      </Card>
      {picks &&
        picks.map((pick: IChamp) => {
          return (
            <Card key={pick.id}>
              {pick.name}
              <Button onClick={() => handleDelete(pick.id)}>X</Button>
            </Card>
          );
        })}

      <Button onClick={handleSaveButton}> Save </Button>
      <Button onClick={handleClearButton}> Reset </Button>
    </div>
  );
};

export default Picks;
