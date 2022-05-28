import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Champion } from 'common/Champion';

// Define a type for the slice state
export interface DataState {
  champions: Array<any>;
  ownedChampion: Array<Champion>;
}

// Define the initial state using that type
const initialState: DataState = {
  champions: [],
  ownedChampion: [],
} as DataState;

const reducer = {
  setChampions: (state: DataState, action: PayloadAction<Array<any>>) => {
    state.champions = action.payload;
    state.ownedChampion = action.payload
      .filter((champion) => {
        return champion.ownership.owned === true;
      })
      .map((champion) => ({
        id: champion.id,
        name: champion.name,
        roles: champion.roles,
      }));
  },
};
export const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: reducer,
});

// Action creators are generated for each case reducer function
export const { setChampions } = dataSlice.actions;

export default dataSlice.reducer;
