import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IChamp } from '../../interfaces/IChamp';

// Define a type for the slice state
export interface PreferencesState {
  bans: Array<IChamp>;
  picks: Array<IChamp>;
}

// Define the initial state using that type
const initialState: PreferencesState = {
  bans: [],
  picks: [],
} as PreferencesState;

const reducer = {
  setBans: (state, action: PayloadAction<Array<IChamp>>) => {
    state.bans = action.payload;
  },
  setPicks: (state, action: PayloadAction<Array<IChamp>>) => {
    state.picks = action.payload;
  },
};
export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: reducer,
});

// Action creators are generated for each case reducer function
export const { setBans, setPicks } = preferencesSlice.actions;

export default preferencesSlice.reducer;
