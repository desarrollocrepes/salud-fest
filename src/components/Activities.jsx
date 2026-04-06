import './Activities.css';
import React, { useState, useEffect, useMemo } from 'react';
import { Check, ArrowLeft, Users, CheckCircle, X, ChevronDown, MapPin, Calendar } from 'lucide-react';

const STRAPI_BASE_URL = (import.meta.env.VITE_STRAPI_URL || 'https://macfer.crepesywaffles.com').replace(/\/$/, '');
const STRAPI_ACTIVIDADES_ENDPOINT = import.meta.env.VITE_STRAPI_ACTIVIDADES_ENDPOINT || '/api/sintonizarte-saludfest-academias';
const STRAPI_ACTIVIDADES_QUERY = import.meta.env.VITE_STRAPI_ACTIVIDADES_QUERY || 'populate[sesiones][populate]=*&populate=icon';

const getAttributes = (item) => item?.attributes || item || {};

const getCategoriaLabel = (categoria) => {
  if (typeof categoria === 'boolean') {
    return categoria ? 'Academia de las Artes' : 'Bienestar';
  }
  return categoria || 'Academia de las Artes';
};

const getTheme = (theme, categoria) => {
  if (theme) return theme;
  return getCategoriaLabel(categoria) === 'Bienestar' ? 'emerald' : 'purple';
};

const parseNumericValue = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatFecha = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return '';
  
  // Si ya tiene formato "14 Abr." devolver como está
  if (/^\d{1,2}\s+\w+\.$/.test(fechaStr)) return fechaStr;
  
  // Convertir "04/14/2026" o "2026-04-14" a "14 Abr."
  let date;
  if (fechaStr.includes('-')) {
    // ISO format "2026-04-14"
    date = new Date(fechaStr + 'T00:00:00');
  } else if (fechaStr.includes('/')) {
    // US format "04/14/2026" o "14/04/2026"
    const parts = fechaStr.split('/');
    if (parts.length === 3) {
      // Detectar si es MM/DD/YYYY o DD/MM/YYYY basado en el valor
      const firstNum = parseInt(parts[0]);
      const secondNum = parseInt(parts[1]);
      if (firstNum > 12) {
        // DD/MM/YYYY
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        // MM/DD/YYYY
        date = new Date(parts[2], parts[0] - 1, parts[1]);
      }
    }
  }
  
  if (!date || isNaN(date.getTime())) return fechaStr;
  
  const meses = ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  return `${dia} ${mes}`;
};

const toAbsoluteMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  return `${STRAPI_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const recolorSvgDataUri = (iconSrc, colorHex) => {
  if (!iconSrc || typeof iconSrc !== 'string' || !iconSrc.startsWith('data:image/svg+xml')) {
    return iconSrc;
  }

  try {
    if (iconSrc.includes(';base64,')) {
      const [prefix, base64Payload] = iconSrc.split(';base64,');
      const decodedSvg = atob(base64Payload);
      const recoloredSvg = decodedSvg.replace(/currentColor/g, colorHex);
      return `${prefix};base64,${btoa(recoloredSvg)}`;
    }

    const [, rawPayload] = iconSrc.split(',');
    const decodedSvg = decodeURIComponent(rawPayload || '');
    const recoloredSvg = decodedSvg.replace(/currentColor/g, colorHex);
    return `data:image/svg+xml,${encodeURIComponent(recoloredSvg)}`;
  } catch {
    return iconSrc;
  }
};

const getIconUrl = (rawIcon) => {
  if (!rawIcon) return '';
  if (typeof rawIcon === 'string') return toAbsoluteMediaUrl(rawIcon);

  const iconAttributes = getAttributes(rawIcon?.data || rawIcon);
  return toAbsoluteMediaUrl(
    iconAttributes?.url ||
    iconAttributes?.formats?.thumbnail?.url ||
    iconAttributes?.formats?.small?.url ||
    ''
  );
};

const normalizeHorarios = (horarios, fechaSession = '') => {
  // Esta función ya no se usa directamente
  // Los horarios se normalizan dentro de normalizeSesiones
  const horarioItems = Array.isArray(horarios)
    ? horarios
    : Array.isArray(horarios?.data)
      ? horarios.data
      : [];

  return horarioItems.map((horarioItem) => {
    const horario = getAttributes(horarioItem);
    
    const horaInicio = horario.hora_inicio || horario.hora || '';
    const horaFin = horario.hora_fin || '';
    let horaFormato = horaInicio;
    if (horaFin && horaInicio) {
      const inicioCorto = horaInicio.split(':').slice(0, 2).join(':');
      const finCorto = horaFin.split(':').slice(0, 2).join(':');
      horaFormato = `${inicioCorto} - ${finCorto}`;
    }
    
    return {
      dia: formatFecha(horario.dia || fechaSession || ''),
      hora: horaFormato,
      actividad: horario.actividad || '',
      descripcion: horario.descripcion || '',
      location: horario.location || horario.ubicacion || '',
      cuposDisponibles: parseNumericValue(horario.cuposDisponibles, 0)
    };
  });
};

const normalizeSesiones = (sesiones) => {
  const sessionItems = Array.isArray(sesiones)
    ? sesiones
    : Array.isArray(sesiones?.data)
      ? sesiones.data
      : [];

  // Normalizar cada horario individual
  const horariosNormalizados = sessionItems.flatMap((sessionItem) => {
    const session = getAttributes(sessionItem);
    
    // Combinar hora_inicio y hora_fin en formato "HH:MM - HH:MM"
    const horaInicio = session.hora_inicio || session.hora || '';
    const horaFin = session.hora_fin || '';
    let horaFormato = horaInicio;
    if (horaFin && horaInicio) {
      const inicioCorto = horaInicio.split(':').slice(0, 2).join(':');
      const finCorto = horaFin.split(':').slice(0, 2).join(':');
      horaFormato = `${inicioCorto} - ${finCorto}`;
    }
    
    return {
      dia: formatFecha(session.dia || ''),
      diaOriginal: session.dia,
      hora: horaFormato,
      actividad: session.actividad || '',
      descripcion: session.descripcion || '',
      location: session.location || session.ubicacion || '',
      cuposDisponibles: parseNumericValue(session.cuposDisponibles, 0)
    };
  });

  // Agrupar horarios por día
  const sesionesAgrupadas = {};
  horariosNormalizados.forEach((horario) => {
    const diaKey = horario.dia;
    if (!sesionesAgrupadas[diaKey]) {
      sesionesAgrupadas[diaKey] = {
        dia: horario.dia,
        diaOriginal: horario.diaOriginal,
        horarios: []
      };
    }
    sesionesAgrupadas[diaKey].horarios.push({
      hora: horario.hora,
      actividad: horario.actividad,
      descripcion: horario.descripcion,
      location: horario.location,
      cuposDisponibles: horario.cuposDisponibles
    });
  });

  return Object.values(sesionesAgrupadas);
};

const normalizeActividad = (actividadItem) => {
  const topLevelId = actividadItem?.id;
  const topLevelDocumentId = actividadItem?.documentId;
  const actividad = getAttributes(actividadItem);
  return {
    id: topLevelId || actividad.id || topLevelDocumentId || actividad.documentId,
    titulo: actividad.titulo || 'Actividad sin titulo',
    categoria: getCategoriaLabel(actividad.categoria),
    theme: getTheme(actividad.theme, actividad.categoria),
    icon: getIconUrl(actividad.icon || actividad.icono || actividad.iconUrl || actividad.iconURL),
    descripcion: actividad.descripcion || '',
    cupoMax: parseNumericValue(actividad.cupoMax, 0),
    sesiones: normalizeSesiones(actividad.sesiones)
  };
};

const fetchActividadesFromApi = async () => {
  const endpoint = STRAPI_ACTIVIDADES_ENDPOINT.startsWith('/')
    ? STRAPI_ACTIVIDADES_ENDPOINT
    : `/${STRAPI_ACTIVIDADES_ENDPOINT}`;

  const requestUrl = new URL(`${STRAPI_BASE_URL}${endpoint}`);
  if (STRAPI_ACTIVIDADES_QUERY) {
    const params = new URLSearchParams(STRAPI_ACTIVIDADES_QUERY);
    params.forEach((value, key) => requestUrl.searchParams.append(key, value));
  }

  const response = await fetch(requestUrl.toString(), {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: no fue posible cargar las actividades`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items.map(normalizeActividad).filter((actividad) => actividad.id);
};

const mockInscriptions = [ /* simular datosd de inscripcion adm */ ];

const SessionModal = ({ activity, isOpen, onClose, onSelect, registrations }) => {
  const [activeDate, setActiveDate] = useState(null);

  useEffect(() => {
    if (isOpen && activity && activity.sesiones && activity.sesiones.length > 0) {
      setActiveDate(activity.sesiones[0].dia);
    }
  }, [isOpen, activity]);

  if (!isOpen || !activity) return null;

  const isEmerald = activity.theme === 'emerald';
  const uniqueDates = (activity.sesiones || []).map(s => s.dia);
  const currentSessionGroup = activity.sesiones && activity.sesiones.find(s => s.dia === activeDate);
  const currentSessions = currentSessionGroup ? currentSessionGroup.horarios : [];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <button onClick={onClose} className="modal-close-btn">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800">{activity.titulo}</h3>
          
          <div className="date-buttons">
            {uniqueDates.map(date => (
              <button
                key={date}
                onClick={() => setActiveDate(date)}
                className={`date-btn ${activeDate === date ? 'active' : ''} ${isEmerald ? 'emerald' : 'purple'}`}
              >
                {date}
              </button>
            ))}
          </div>

          <div className="horarios-section">
            {currentSessions && currentSessions.length > 0 ? (
              <div className="session-grid">
                {currentSessions.map((session, idx) => {
                  const isFull = session.cuposDisponibles === 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => !isFull && onSelect(session)}
                      className={`session-slot ${isFull ? 'full' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="session-time font-semibold text-gray-800">{session.hora}</span>
                      </div>
                      
                      {session.location && (
                        <div className="flex items-center text-xs text-gray-600 mb-2">{session.location}</div>
                      )}
                      
                      {session.actividad && (
                        <div className="text-xs text-gray-700 mb-2 font-medium">{session.actividad}</div>
                      )}
                      
                      {session.descripcion && (
                        <div className="text-xs text-gray-600 mb-2 italic">{session.descripcion}</div>
                      )}
                      
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`cupos-tag ${isFull ? 'full' : 'available'}`}>
                          {isFull ? 'AGOTADO' : `${session.cuposDisponibles} CUPO${session.cuposDisponibles !== 1 ? 'S' : ''}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No hay horarios disponibles para esta fecha
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className={`confirm-btn ${isEmerald ? '' : 'purple'}`}>
            CONFIRMAR INSCRIPCIÓN <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ActivityCard = ({ activity, onSelect, isEmerald }) => {
  const themedIcon = recolorSvgDataUri(activity.icon, isEmerald ? '#10b981' : '#a855f7');

  return (
    <div className={`activity-card ${isEmerald ? 'emerald' : 'purple'}`}>
      <div className={`activity-card-icon-wrapper ${isEmerald ? 'emerald' : 'purple'}`}>
        {themedIcon ? (
          <img src={themedIcon} alt={activity.titulo} className="activity-card-icon-image" loading="lazy" />
        ) : (
          <span className="activity-card-icon-fallback">?</span>
        )}
      </div>
      <h3 className="activity-card-title">{activity.titulo}</h3>
      <div className="activity-card-header">
        <span className={`activity-badge ${isEmerald ? 'emerald' : 'purple'}`}>
          {isEmerald ? 'Bienestar' : 'Academia de las Artes'}
        </span>
      </div>
      <div className="activity-card-cupos">
        {activity.cupoMax ? `${activity.cupoMax} cupos por sesión` : 'Sin límite de cupos'}
      </div>
      <p className="activity-card-description">{activity.descripcion}</p>
      <button
        onClick={() => onSelect(activity)}
        className={`activity-card-btn ${isEmerald ? 'emerald' : 'purple'}`}
      >
        INSCRIBIRSE <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};

const HomeView = ({ onSelectActivity, actividades, isLoading, loadError }) => {
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(true);

  const actividadesEmerald = useMemo(() => {
    return actividades.filter((a) => a.theme === 'emerald' || a.categoria === 'Bienestar');
  }, [actividades]);

  const actividadesPurpleColumns = useMemo(() => {
    const purpleActivities = actividades.filter(
      (a) => !(a.theme === 'emerald' || a.categoria === 'Bienestar')
    );

    return purpleActivities.reduce(
      (columns, activity, index) => {
        columns[index % 3].push(activity);
        return columns;
      },
      [[], [], []]
    );
  }, [actividades]);

  return (
    <div className="home-view">
      {isWelcomeOpen && (
        <div className="welcome-modal-overlay">
          <div className="welcome-modal" role="dialog" aria-modal="true" aria-label="Bienvenida Salud Fest">

            <div className="welcome-header">
              <img src="/sf1.JPG" alt="Salud Fest Logo" className="welcome-logo" />
              <div>
                <h1 className="welcome-title">SALUD FEST 2026</h1>
                <p className="welcome-subtitle">Vive una semana para reconectar contigo</p>
              </div>
            </div>

            <div className="welcome-info-row">
              <div className="welcome-info-item">
                <MapPin size={18} className="info-icon" />
                <span>Toberín, Bogotá</span>
              </div>
              <div className="welcome-info-item">
                <Calendar size={18} className="info-icon" />
                <span>Martes 14 - Viernes 17 de Abril</span>
              </div>
            </div>

            <p className="welcome-description">
              Explora las actividades y reserva tu lugar en las experiencias que te gustaría vivir.
              <span className="subtitle-highlight"> <br></br>¡Puedes inscribirte en tantas como quieras!</span>
            </p>

            <button className="welcome-cta-btn" onClick={() => setIsWelcomeOpen(false)}>
              VER ACTIVIDADES
            </button>
          </div>
        </div>
      )}

      <div className="activities-container">
        {isLoading && (
          <div className="text-center text-gray-500 py-8">Cargando actividades...</div>
        )}

        {!isLoading && loadError && (
          <div className="text-center text-red-500 py-8">{loadError}</div>
        )}

        {!isLoading && !loadError && actividades.length === 0 && (
          <div className="text-center text-gray-500 py-8">No hay actividades publicadas por el momento.</div>
        )}

        <section className="bienestar-section">
          <div className="activities-grid bienestar-grid">
            {actividadesEmerald.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onSelect={onSelectActivity}
                isEmerald
              />
            ))}
          </div>
        </section>

        <section className="artes-section artes-section1">
          <div className="activities-grid artes-grid">
            {actividadesPurpleColumns[0].map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onSelect={onSelectActivity}
                isEmerald={false}
              />
            ))}
          </div>
        </section>

        <section className="artes-section artes-section2">
          <div className="activities-grid artes-grid">
            {actividadesPurpleColumns[1].map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onSelect={onSelectActivity}
                isEmerald={false}
              />
            ))}
          </div>
        </section>

        <section className="artes-section artes-section3">
          <div className="activities-grid artes-grid">
            {actividadesPurpleColumns[2].map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onSelect={onSelectActivity}
                isEmerald={false}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const SaludFestView = ({ selectedActivity, onBackToHome, onSelectSession }) => {
  if (!selectedActivity) return null;

  const isEmerald = selectedActivity.theme === 'emerald';
  const themedIcon = recolorSvgDataUri(selectedActivity.icon, isEmerald ? '#10b981' : '#a855f7');

  return (
    <div className="saludfest-view">
      <button onClick={onBackToHome} className="back-btn">
        <ArrowLeft className="w-4 h-4" /> VOLVER
      </button>

      <div className={`activity-detail ${isEmerald ? 'emerald' : 'purple'}`}>
        <div className={`activity-detail-icon ${isEmerald ? 'emerald' : 'purple'}`}>
          {themedIcon ? (
            <img src={themedIcon} alt={selectedActivity.titulo} className="activity-detail-icon-image" loading="lazy" />
          ) : (
            <span className="activity-card-icon-fallback">?</span>
          )}
        </div>
        <h2 className="activity-detail-title">{selectedActivity.titulo}</h2>
        <p className="activity-detail-description">{selectedActivity.descripcion}</p>
        <div className="activity-detail-info">
          <span className={`activity-info-badge ${isEmerald ? 'emerald' : 'purple'}`}>
            <Users className="w-4 h-4" /> Máximo {selectedActivity.cupoMax} participantes
          </span>
        </div>
      </div>

      <button
        onClick={() => onSelectSession(selectedActivity)}
        className={`register-btn ${isEmerald ? 'emerald' : 'purple'}`}
      >
        INSCRIBIRSE <CheckCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

const Activities = () => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadActivities = async () => {
      try {
        setIsLoading(true);
        setLoadError('');
        const activitiesFromApi = await fetchActividadesFromApi();

        if (isMounted) {
          setActividades(activitiesFromApi);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || 'No fue posible cargar las actividades.');
          setActividades([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedActivity(null);
  };

  const handleOpenSessionModal = (activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  const handleSelectSession = (session) => {
    const newRegistration = {
      id: Date.now(),
      activityId: selectedActivity.id,
      activity: selectedActivity.titulo,
      session: session,
      timestamp: new Date().toLocaleString('es-ES')
    };
    setRegistrations([...registrations, newRegistration]);
    handleCloseModal();
  };

  return (
    <div className="app-wrapper">
      <HomeView
        onSelectActivity={handleSelectActivity}
        actividades={actividades}
        isLoading={isLoading}
        loadError={loadError}
      />
      <SessionModal
        activity={selectedActivity}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelect={handleSelectSession}
        registrations={registrations}
      />
    </div>
  );
};

export default Activities;