'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { people, houses, type Person, type House } from '@/config';
import { CHECKLISTS } from '@/checklists';
import type { ChecklistSchema } from '@/config';
import { getPendingCount } from '@/lib/offline-storage';
import { initAutoSync } from '@/lib/sync';
import { getIconComponent } from '@/lib/icons';

type Step = 'person' | 'house' | 'checklist';

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('person');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [toast, setToast] = useState<string>('');
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem('arborea-last-person');
    if (saved) {
      const person = people.find(p => p.id === saved);
      if (person) {
        setSelectedPerson(person);
        setStep('house');
      }
    }

    // Inicializar auto-sync
    initAutoSync();

    // Actualizar contador de pendientes
    updatePendingCount();

    // Actualizar cada 10 segundos
    const interval = setInterval(updatePendingCount, 10000);

    return () => clearInterval(interval);
  }, []);

  const updatePendingCount = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error obteniendo pendientes:', error);
    }
  };

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setSelectedHouse(null);
    localStorage.setItem('arborea-last-person', person.id);
    setStep('house');
  };

  const handleHouseClick = (house: House) => {
    setSelectedHouse(house);
    setStep('checklist');
  };

  const handleChecklistClick = (checklist: ChecklistSchema) => {
    if (!selectedPerson || !selectedHouse) {
      return;
    }

    // Guardar casa y responsable en localStorage para la página del checklist
    localStorage.setItem('arborea_casa', selectedHouse.name);
    localStorage.setItem('arborea_responsable', selectedPerson.name);

    // Navegar a la ruta del checklist
    router.push(`/checklist/${checklist.id}`);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const resetToStep = (targetStep: Step) => {
    if (targetStep === 'person') {
      setSelectedPerson(null);
      setSelectedHouse(null);
      setStep('person');
    } else if (targetStep === 'house') {
      setSelectedHouse(null);
      setStep('house');
    }
  };

  const roleChecklists = CHECKLISTS.filter(c => c.role === selectedPerson?.role);

  return (
    <div className="wrap">
      <header>
        <Image
          src="/sub-logo.png"
          alt="Arbórea Experiences"
          width={188}
          height={48}
          className="lockup"
          priority
        />
        <div className="trail">
          {selectedPerson && (
            <>
              <button onClick={() => resetToStep('person')}>{selectedPerson.name}</button>
              <span className="sep">→</span>
            </>
          )}
          {selectedHouse && (
            <>
              <button onClick={() => resetToStep('house')}>{selectedHouse.name}</button>
              <span className="sep">→</span>
            </>
          )}
          {pendingCount > 0 && (
            <span className="pending-badge" title={`${pendingCount} ${pendingCount === 1 ? 'envío' : 'envíos'} pendiente${pendingCount === 1 ? '' : 's'}`}>
              {pendingCount}
            </span>
          )}
        </div>
      </header>

      <main>
        {step === 'person' && (
          <div className="view">
            <div className="step">Persona</div>
            <div className="grid two">
              {people.map(person => (
                <button
                  key={person.id}
                  className="btn"
                  onClick={() => handlePersonClick(person)}
                >
                  <div className="ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    </svg>
                  </div>
                  <div className="body">
                    <div className="ttl">{person.name}</div>
                    <div className="role">{person.sub}</div>
                  </div>
                  <div className="go">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'house' && selectedPerson && (
          <div className="view">
            <div className="step">Casa</div>
            <div className="grid">
              {houses.map(house => (
                <button
                  key={house.id}
                  className="btn"
                  onClick={() => handleHouseClick(house)}
                >
                  <div className="ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <path d="M9 22V12h6v10" />
                    </svg>
                  </div>
                  <div className="body">
                    <div className="ttl">{house.name}</div>
                  </div>
                  <div className="go">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            <button className="back" onClick={() => resetToStep('person')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              volver
            </button>
          </div>
        )}

        {step === 'checklist' && selectedPerson && selectedHouse && (
          <div className="view">
            <div className="step">Checklist</div>
            <div className="grid">
              {roleChecklists.map(checklist => {
                const IconComponent = getIconComponent(checklist.icon);
                return (
                  <button
                    key={checklist.id}
                    className="btn"
                    onClick={() => handleChecklistClick(checklist)}
                  >
                    <div className="ico">
                      <IconComponent />
                    </div>
                    <div className="body">
                      <div className="ttl">{checklist.label}</div>
                      <div className="sub">{selectedHouse.name}</div>
                    </div>
                    <div className="go">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
            <button className="back" onClick={() => resetToStep('house')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              volver
            </button>
          </div>
        )}

        <footer>donde el bosque respira</footer>
      </main>

      <div className={`toast ${toast ? 'show' : ''}`} dangerouslySetInnerHTML={{ __html: toast }} />
    </div>
  );
}
