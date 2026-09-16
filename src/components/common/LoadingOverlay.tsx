import React from 'react';
import { useApp } from '../../App';

export const LoadingOverlay: React.FC = () => {
  const { loading, loadingMessage } = useApp();

  if (!loading) return null;

  return (
    <div id="lov" className="on">
      <div className="spw">
        <div className="spo"></div>
        <div className="spi"></div>
      </div>
      <span id="lmsg">{loadingMessage}</span>
    </div>
  );
};
