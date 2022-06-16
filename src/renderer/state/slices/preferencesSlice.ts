import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Champion from 'api/entities/Champion';

// Define a type for the slice state
export interface PreferencesState {
  bans: Array<Champion>;
  picks: Array<Champion>;
}

// Define the initial state using that type
const initialState: PreferencesState = {
  bans: [],
  picks: [],
} as PreferencesState;

const reducer = {
  setBans: (
    state: PreferencesState,
    action: PayloadAction<Array<Champion>>
  ) => {
    state.bans = action.payload;
  },
  setPicks: (
    state: PreferencesState,
    action: PayloadAction<Array<Champion>>
  ) => {
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
