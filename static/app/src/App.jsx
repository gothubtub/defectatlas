import React from 'react';
import { useAtlas } from './state/AtlasContext';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import Canvas from './components/Canvas';
import DetailPanel from './components/DetailPanel';
import Timeline from './components/Timeline';
import RenameModal from './components/modals/RenameModal';
import ConfirmModal from './components/modals/ConfirmModal';
import PromptModal from './components/modals/PromptModal';
import SpaceSyncModal from './components/modals/SpaceSyncModal';
import MembersModal from './components/modals/MembersModal';
import ErrorToast from './components/ErrorToast';

export default function App() {
  const { loading } = useAtlas();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0b0e', color: '#8b93a1', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
        loading Defect Atlas…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0b0e', color: '#e7e9ee', overflow: 'hidden', fontSize: 14 }}>
      <Header />
      <FilterBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Canvas />
        <DetailPanel />
      </div>
      <Timeline />

      <RenameModal />
      <ConfirmModal />
      <PromptModal />
      <SpaceSyncModal />
      <MembersModal />
      <ErrorToast />
    </div>
  );
}
