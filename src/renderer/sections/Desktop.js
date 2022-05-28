import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Spinner, Switch } from '@blueprintjs/core';
import { BANS } from 'common/constants';

export const Desktop = () => {
  const [isOn, setIsOn] = React.useState(false);
  const [lolClientFound, setLolClientFound] = React.useState(false);
  const navigate = useNavigate();

  window.electron.ipcRenderer.on('connect', (event, data) => {
    setLolClientFound(true);
  });

  return (
    <div className="desktop">
      <Switch
        large
        alignIndicator={'right'}
        className="onOff"
        checked={isOn}
        label={isOn ? 'Turned On' : 'Turned Off'}
        onChange={() => {
          setIsOn(!isOn);
        }}
      />
      {!lolClientFound && <Spinner></Spinner>}
      <Card
        className={'ban-card card'}
        onClick={() => {
          navigate('/bans', { replace: true });
        }}
      >
        <h5>
          <p href="#">Ban priority</p>
        </h5>
        <p>Card content</p>
      </Card>

      <Card
        className={'pick-card card'}
        onClick={() => {
          navigate('/picks', { replace: true });
        }}
      >
        <h5>
          <p>Pick priority</p>
        </h5>
        <p>Card content</p>
      </Card>
    </div>
  );
};
