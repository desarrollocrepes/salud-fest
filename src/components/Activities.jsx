import './Activities.css';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Users, CheckCircle, X, ChevronDown, MapPin, Calendar, LogOut, Loader, UserStar, Edit, Trash2, Plus, Save } from 'lucide-react';
import Login from './Login';

const STRAPI_BASE_URL = (import.meta.env.VITE_STRAPI_URL || 'https://macfer.crepesywaffles.com').replace(/\/$/, '');
const STRAPI_ACTIVIDADES_ENDPOINT = import.meta.env.VITE_STRAPI_ACTIVIDADES_ENDPOINT || '/api/sintonizarte-saludfest-academias';
// Probar con populate=* para traer TODAS las relaciones
const STRAPI_ACTIVIDADES_QUERY = import.meta.env.VITE_STRAPI_ACTIVIDADES_QUERY || 'populate=*';

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
  
  // Si ya tiene formato "Martes 14 abril" devolver como está
  if (/^[A-Z]\w+\s+\d{1,2}\s+\w+$/.test(fechaStr)) return fechaStr;
  
  // Convertir "04/14/2026" o "2026-04-14" a "Martes 14 abril"
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
  
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const diaSemana = diasSemana[date.getDay()];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  return `${diaSemana} ${dia} ${mes}`;
};

// Convertir cualquier formato de fecha a formato ISO yyyy-MM-dd
const formatToISODate = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return '';
  
  // Si ya está en formato ISO "2026-04-17", devolver como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
  
  let date;
  
  // Formato español: "Viernes 17 abril" -> necesitamos agregar el año (2026)
  if (/^[A-Z]\w+\s+\d{1,2}\s+\w+$/.test(fechaStr)) {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const partes = fechaStr.split(' ');
    const dia = parseInt(partes[1]);
    const mesNombre = partes[2].toLowerCase();
    const mesIndex = meses.indexOf(mesNombre);
    
    if (mesIndex !== -1) {
      // Asumimos 2026 para las fechas del evento
      date = new Date(2026, mesIndex, dia);
    }
  }
  // Formato slash: "04/14/2026" o "14/04/2026"
  else if (fechaStr.includes('/')) {
    const parts = fechaStr.split('/');
    if (parts.length === 3) {
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
  // Formato con guión que no es ISO completo
  else if (fechaStr.includes('-')) {
    date = new Date(fechaStr + 'T00:00:00');
  }
  
  if (!date || isNaN(date.getTime())) {
    return fechaStr;
  }
  
  // Convertir a formato ISO yyyy-MM-dd
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;
  
  return isoDate;
};

// Convertir formato de hora a HH:mm:ss.SSS
const formatToISOTime = (horaStr) => {
  if (!horaStr || typeof horaStr !== 'string') return '';
  
  // Si ya está en formato completo "HH:mm:ss.SSS", devolver como está
  if (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(horaStr)) return horaStr;
  
  // Si tiene formato "HH:mm:ss", agregar milisegundos
  if (/^\d{2}:\d{2}:\d{2}$/.test(horaStr)) return `${horaStr}.000`;
  
  // Si tiene formato "HH:mm", agregar segundos y milisegundos
  if (/^\d{1,2}:\d{2}$/.test(horaStr)) {
    const [h, m] = horaStr.split(':');
    const horaISO = `${h.padStart(2, '0')}:${m}:00.000`;
    return horaISO;
  }
  
  // Formato no reconocido
  return horaStr;
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
    const topLevelId = sessionItem?.id;
    const topLevelDocumentId = sessionItem?.documentId;
    const session = getAttributes(sessionItem);
    
    // Log para debug de IDs
    const finalId = topLevelId || session.id || topLevelDocumentId || session.documentId;
    
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
      id: finalId,
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
      id: horario.id,
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
  
  const finalId = topLevelId || actividad.id || topLevelDocumentId || actividad.documentId;
  
  // Buscar el campo que contiene los horarios (puede tener diferentes nombres)
  let horariosData = actividad.horarios 
    || actividad.sintonizarte_saludfest_horarios 
    || actividad.sesiones
    || actividad.sintonizarte_saludfest_sesiones;
  
  const sesionesNormalizadas = normalizeSesiones(horariosData);
  
  return {
    id: finalId,
    titulo: actividad.titulo || 'Actividad sin titulo',
    categoria: getCategoriaLabel(actividad.categoria),
    theme: getTheme(actividad.theme, actividad.categoria),
    icon: getIconUrl(actividad.icon || actividad.icono || actividad.iconUrl || actividad.iconURL),
    descripcion: actividad.descripcion || '',
    cupoMax: parseNumericValue(actividad.cupoMax, 0),
    sesiones: sesionesNormalizadas
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
  
  // Log de la primera actividad con sus horarios
  if (items.length > 0) {
    const primeraActividad = items[0];
    const attr = getAttributes(primeraActividad);
  }

  return items.map(normalizeActividad).filter((actividad) => actividad.id);
};

const mockInscriptions = [ /* simular datosd de inscripcion adm */ ];

// Función para guardar inscripción en la API
const INSCRIPCIONES_API_URL = 'https://macfer.crepesywaffles.com/api/sintonizarte-saludfest-inscripcions';

const saveInscripcion = async (inscripcionData) => {
  try {
    const response = await fetch(INSCRIPCIONES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inscripcionData),
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      
      console.error('❌ Error al guardar inscripción:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData,
        sentData: inscripcionData
      });
      
      throw new Error(
        errorData?.message || 
        errorData?.error?.message || 
        `Error ${response.status}: No fue posible guardar la inscripción`
      );
    }

    const result = await response.json();
    console.log('✅ Inscripción guardada exitosamente:', result);
    
    // Pequeno delay para asegurar que la API procesa la inscripción
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return result;
  } catch (error) {
    console.error('❌ Exception en saveInscripcion:', error);
    throw new Error(error.message || 'Error al guardar la inscripción en el servidor');
  }
};

// Obtener inscripciones del usuario desde la API
const fetchInscripcionesFromApi = async (documentNumber) => {
  try {
    // Agregar populate para traer los horarios relacionados con todos sus campos
    const url = new URL(INSCRIPCIONES_API_URL);
    url.searchParams.append('populate', '*');
    
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: No fue posible cargar las inscripciones`);
    }

    const payload = await response.json();
    const inscripciones = Array.isArray(payload?.data) ? payload.data : [];
    
    
    // Filtrar solo las inscripciones del usuario actual
    const resultado = inscripciones.filter(ins => {
      const attr = getAttributes(ins);
      return String(attr.documento) === String(documentNumber);
    });
    
    return resultado;
  } catch (error) {
    return [];
  }
};

// Transformar inscripción de API a formato de reserva para mostrar
const transformInscripcionToReserva = (inscripcion) => {
  const attr = getAttributes(inscripcion);
  
  // Extraer datos del primer horario relacionado
  let fecha = '';
  let hora = '';
  let location = '';
  
  if (attr.horarios && attr.horarios.data && Array.isArray(attr.horarios.data) && attr.horarios.data.length > 0) {
    const primerHorario = getAttributes(attr.horarios.data[0]);
    
    // Formatear fecha
    if (primerHorario.dia) {
      fecha = formatFecha(primerHorario.dia);
    }
    
    // Formatear hora: combinar hora_inicio y hora_fin
    if (primerHorario.hora_inicio || primerHorario.hora_fin) {
      const horaInicio = primerHorario.hora_inicio ? primerHorario.hora_inicio.slice(0, 5) : '';
      const horaFin = primerHorario.hora_fin ? primerHorario.hora_fin.slice(0, 5) : '';
      hora = horaFin && horaInicio ? `${horaInicio} - ${horaFin}` : horaInicio;
    }
    
    // Ubicación
    location = primerHorario.location || '';
  }
  
  const reserva = {
    id: inscripcion.id || Date.now(),
    actividad: attr.area || 'Sin actividad',
    nombre: attr.nombre || '',
    documento: attr.documento || '',
    correo: attr.correo || '',
    telefono: attr.telefono || '',
    fecha: fecha,
    hora: hora,
    location: location,
    timestamp: attr.publishedAt || attr.createdAt || new Date().toISOString()
  };
  return reserva;
};

// Validar que no haya duplicados del mismo taller el mismo día
const validateDuplicateWorkshop = async (usuario, activity, activeDate) => {
  if (!usuario || !activity) return null;
  
  try {
    const inscripciones = await fetchInscripcionesFromApi(usuario.document_number);
    
    
    // Buscar inscripciones del mismo taller en la misma fecha
    const duplicado = inscripciones.find(ins => {
      const attr = getAttributes(ins);
      
      // Comparar área (taller)
      if (attr.area !== activity.titulo) {
        return false;
      }
      
      
      // Comparar fecha directamente del campo fecha de la inscripción
      if (attr.fecha !== activeDate) {
        return false;
      }
      
      return true;
    });
    
    if (duplicado) {
      return {
        existe: true,
        mensaje: `Ya estás inscrito a "${activity.titulo}" el ${activeDate}. No puedes inscribirte nuevamente el mismo día.`
      };
    }
    
    return { existe: false };
  } catch (error) {
    return null;
  }
};

// Función para crear una nueva sesión
const createSesion = async (activityId, sesionData) => {
  try {
    

    const payload = {
      data: {
        ...sesionData,
        sintonizarte_saludfest_academia: activityId,
        academia: activityId,
        sintonizarte_saludfest_academias: {
          connect: [activityId]
        },
        academias: {
          connect: [activityId]
        }
      }
    };
    

    const response = await fetch(`${STRAPI_BASE_URL}/api/sintonizarte-saludfest-horarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ ERROR AL CREAR HORARIO - Detalles completos:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        activityId: activityId,
        payload: payload
      });
      console.error('💡 AYUDA: Verifica en Strapi Admin Panel → Content-Type Builder → sintonizarte-saludfest-horarios → busca el campo de relación con academias y anota su "API ID (Singular)"');
      throw new Error(
        errorData?.error?.message || 
        errorData?.message || 
        `Error ${response.status}: No fue posible crear la sesión`
      );
    }

    const result = await response.json();
    console.log('✅ HORARIO CREADO EXITOSAMENTE:', result);
    console.log('🔗 Verificar relación - result.data.attributes:', result?.data?.attributes);
    console.log('🔗 Campos de relación encontrados:', 
      Object.keys(result?.data?.attributes || {}).filter(key => 
        key.includes('academia') || key.includes('sintonizarte')
      )
    );
    console.log('🆕 ======================================\n');
    return result;
  } catch (error) {

    throw new Error(error.message || 'Error al crear la sesión en el servidor');
  }
};

// Función para actualizar una sesión existente
const updateSesion = async (sesionId, sesionData) => {
  try {
    
    const payload = {
      data: sesionData
    };
    
    
    const response = await fetch(`${STRAPI_BASE_URL}/api/sintonizarte-saludfest-horarios/${sesionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message || 
        errorData?.message || 
        `Error ${response.status}: No fue posible actualizar la sesión`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(error.message || 'Error al actualizar la sesión en el servidor');
  }
};

// Función para eliminar una sesión
const deleteSesion = async (sesionId) => {
  try {
    
    const response = await fetch(`${STRAPI_BASE_URL}/api/sintonizarte-saludfest-horarios/${sesionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message || 
        errorData?.message || 
        `Error ${response.status}: No fue posible eliminar la sesión`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(error.message || 'Error al eliminar la sesión del servidor');
  }
};

// Validar conflicto de horarios entre talleres
const validateTimeConflict = async (usuario, selectedSession, activeDate) => {
  if (!usuario || !selectedSession) return null;
  
  try {
    const inscripciones = await fetchInscripcionesFromApi(usuario.document_number);
    
    
    // Extraer horas del horario seleccionado
    const [horaInicio, horaFin] = selectedSession.hora.split(' - ').map(h => h.trim());
    
    
    // Buscar conflictos de horario el mismo día
    for (const ins of inscripciones) {
      const attr = getAttributes(ins);
      
      
      // Solo revisar inscripciones del mismo día
      if (attr.fecha !== activeDate) {
        continue;
      }
      
      // Extraer horas del horario existente
      const [existHoraInicio, existHoraFin] = (attr.hora || '').split(' - ').map(h => h.trim());
      
      if (!existHoraInicio || !horaInicio) {
        continue;
      }
      
      // Comparar horarios: convertir a minutos para facilitar comparación
      const toMinutes = (time) => {
        const parts = time.split(':');
        if (parts.length !== 2) return null;
        const [h, m] = parts.map(Number);
        const result = h * 60 + m;
        return result;
      };
      
      try {
        const nuevoInicio = toMinutes(horaInicio);
        const nuevoFin = toMinutes(horaFin || horaInicio);
        const existInicio = toMinutes(existHoraInicio);
        const existFin = toMinutes(existHoraFin || existHoraInicio);
        
        
        // Verificar si hay solapamiento: 
        // Hay conflicto si: nuevo_inicio < existe_fin AND nuevo_fin > existe_inicio
        if (nuevoInicio < existFin && nuevoFin > existInicio) {
          return {
            existe: true,
            mensaje: `Conflicto de horario: Ya tienes una inscripción a las ${existHoraInicio}${existHoraFin ? ` - ${existHoraFin}` : ''} el ${activeDate}. No puedes reservar un taller que se cruce con este horario.`
          };
        }
      } catch (e) {
      }
    }
    
    return { existe: false };
  } catch (error) {
    return null;
  }
};

const SessionModal = ({ activity, isOpen, onClose, onSelect, registrations, usuario, onReservationSuccess, isAdminMode, onEditSession, onDeleteSession, onCreateSession }) => {
  const [activeDate, setActiveDate] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    if (isOpen && activity && activity.sesiones && activity.sesiones.length > 0) {
      setActiveDate(activity.sesiones[0].dia);
      setSelectedSession(null);
      setErrorMsg('');
      setShowEditModal(false);
      setEditingSession(null);
      setIsCreatingNew(false);
      setSuccessMsg('');
      setShowConfirmation(false);
      setPhoneInput('');
    }
  }, [isOpen, activity]);

  const handleEditClick = (session) => {
    
    // Encontrar la fecha original (sin formato) de la sesión
    const currentSessionGroup = activity.sesiones && activity.sesiones.find(s => s.dia === activeDate);
    const diaOriginal = currentSessionGroup?.diaOriginal || activeDate;
    
    setEditingSession({
      id: session.id,
      dia: activeDate, // Para mostrar en el formulario
      diaOriginal: diaOriginal, // Para enviar al backend
      hora_inicio: session.hora.split(' - ')[0] || '',
      hora_fin: session.hora.split(' - ')[1] || '',
      actividad: session.actividad || '',
      descripcion: session.descripcion || '',
      location: session.location || '',
      cuposDisponibles: session.cuposDisponibles || 0
    });
    setIsCreatingNew(false);
    setShowEditModal(true);
  };

  const handleCreateClick = () => {
    
    // Encontrar la fecha original (sin formato)
    const currentSessionGroup = activity.sesiones && activity.sesiones.find(s => s.dia === activeDate);
    const diaOriginal = currentSessionGroup?.diaOriginal || activeDate;
    
    setEditingSession({
      dia: activeDate, // Para mostrar en el formulario
      diaOriginal: diaOriginal, // Para enviar al backend
      hora_inicio: '',
      hora_fin: '',
      actividad: '',
      descripcion: '',
      location: '',
      cuposDisponibles: 0
    });
    setIsCreatingNew(true);
    setShowEditModal(true);
  };

  const handleSaveSession = async () => {
    if (!editingSession) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Usar la fecha original o parseada correctamente para el backend
      let diaParaBackend = editingSession.diaOriginal || editingSession.dia;
      
      // Si el usuario modificó la fecha manualmente, intentar convertirla
      if (editingSession.dia !== activeDate) {
        diaParaBackend = editingSession.dia;
      }
      
      // IMPORTANTE: Convertir la fecha a formato ISO yyyy-MM-dd para el backend
      const diaISO = formatToISODate(diaParaBackend);
      
      // IMPORTANTE: Convertir las horas a formato HH:mm:ss.SSS para el backend
      const horaInicioISO = formatToISOTime(editingSession.hora_inicio);
      const horaFinISO = formatToISOTime(editingSession.hora_fin);
      
      const sessionData = {
        dia: diaISO,
        hora_inicio: horaInicioISO,
        hora_fin: horaFinISO,
        actividad: editingSession.actividad,
        descripcion: editingSession.descripcion,
        location: editingSession.location,
        cuposDisponibles: parseInt(editingSession.cuposDisponibles) || 0
      };


      if (isCreatingNew) {
        const result = await createSesion(activity.id, sessionData);
        setSuccessMsg('¡Sesión creada exitosamente!');
      } else {
        const result = await updateSesion(editingSession.id, sessionData);
        setSuccessMsg('¡Sesión actualizada exitosamente!');
      }

      // Refrescar actividades
      if (onReservationSuccess) {
        await onReservationSuccess();
      }

      setTimeout(() => {
        setShowEditModal(false);
        setEditingSession(null);
        setSuccessMsg('');
      }, 1500);
    } catch (error) {
      setErrorMsg(error.message || 'Error al guardar la sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (session) => {
    
    if (!confirm('¿Estás seguro de que deseas eliminar esta sesión?')) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      
      const result = await deleteSesion(session.id);
      setSuccessMsg('¡Sesión eliminada exitosamente!');

      // Refrescar actividades
      if (onReservationSuccess) {
        await onReservationSuccess();
      }

      setTimeout(() => {
        setSuccessMsg('');
      }, 1500);
    } catch (error) {
      setErrorMsg(error.message || 'Error al eliminar la sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmInscripcion = async () => {
    if (!selectedSession) {
      setErrorMsg('Por favor selecciona un horario');
      return;
    }

    if (!usuario) {
      setErrorMsg('Usuario no autenticado');
      return;
    }

    // Mostrar modal de confirmación
    setShowConfirmation(true);
  };

  const handleConfirmReservation = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Validar que tenga teléfono (registrado o ingresado en el modal)
      const telefonoDisponible = usuario.telefono || phoneInput;
      
      if (!telefonoDisponible || !String(telefonoDisponible).trim()) {
        setErrorMsg('Por favor ingresa tu número de teléfono');
        setIsSubmitting(false);
        return;
      }
      
      // ✅ VALIDACIÓN 1: Verificar duplicado del mismo taller el mismo día
      const duplicadoCheck = await validateDuplicateWorkshop(usuario, activity, activeDate);
      
      if (duplicadoCheck?.existe) {
        setErrorMsg(duplicadoCheck.mensaje);
        setShowConfirmation(false);
        setIsSubmitting(false);
        return;
      }
      
      // ✅ VALIDACIÓN 2: Verificar conflicto de horarios
      const conflictoCheck = await validateTimeConflict(usuario, selectedSession, activeDate);
      
      if (conflictoCheck?.existe) {
        setErrorMsg(conflictoCheck.mensaje);
        setShowConfirmation(false);
        setIsSubmitting(false);
        return;
      }
      
      // ✅ Si pasó todas las validaciones, proceder con la inscripción
      // Limpiar teléfono: solo números
      const telefonoLimpio = String(telefonoDisponible).replace(/\D/g, '').trim();
      const telefonoNumero = telefonoLimpio ? parseInt(telefonoLimpio, 10) : null;
      
      const inscripcionData = {
        data: {
          nombre: usuario.nombre || '',
          documento: String(usuario.document_number),
          telefono: telefonoNumero,
          correo: usuario.correo || '',
          area: activity.titulo || '',
          fecha: activeDate || '',
          hora: selectedSession.hora || '',
          ubicacion: selectedSession.location || '',
          horarios: [parseInt(selectedSession.id)],
        }
      };
      
      console.log('📤 Datos siendo enviados a la API:', JSON.stringify(inscripcionData, null, 2));

      
      await saveInscripcion(inscripcionData);
      
      setSuccessMsg('¡Inscripción realizada con éxito!');
      setShowConfirmation(false);
      
      // Llamar callback para refrescar reservas y actividades desde API
      if (onReservationSuccess) {
        await onReservationSuccess();
      }
      
      // Llamar onSelect con la sesión seleccionada
      onSelect(selectedSession);
      
      // Cerrar el modal después de 2 segundos
      setTimeout(() => {
        setSelectedSession(null);
        setSuccessMsg('');
        setErrorMsg('');
        setPhoneInput('');
        onClose();
      }, 2000);
    } catch (error) {
      setErrorMsg(error.message || 'Error al realizar la inscripción');
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !activity) return null;

  const isEmerald = activity.theme === 'emerald';
  const uniqueDates = (activity.sesiones || []).map(s => s.dia);
  const currentSessionGroup = activity.sesiones && activity.sesiones.find(s => s.dia === activeDate);
  const currentSessions = currentSessionGroup ? currentSessionGroup.horarios : [];

  // Modal de edición de sesión
  if (showEditModal && editingSession) {
    return (
      <div className="modal-overlay">
        <div className="edit-modal-content">
          <div className="edit-modal-header">
            <h3>
              {isCreatingNew ? 'Crear Nueva Sesión' : 'Editar Sesión'}
            </h3>
            <button onClick={() => setShowEditModal(false)} className="modal-close-btn" disabled={isSubmitting}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="edit-modal-body">
            {errorMsg && (
              <div className="alert-message alert-error">
                <X className="w-5 h-5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="alert-message alert-success">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="edit-form-grid">
              <div className="edit-form-group">
                <label className="edit-form-label">Fecha</label>
                <input
                  type="text"
                  value={editingSession.dia}
                  onChange={(e) => setEditingSession({ ...editingSession, dia: e.target.value })}
                  className="edit-form-input"
                  placeholder="Martes 14 abril"
                  disabled={isSubmitting}
                />
              </div>

              <div className="edit-form-row">
                <div className="edit-form-group">
                  <label className="edit-form-label">Hora Inicio</label>
                  <input
                    type="time"
                    value={editingSession.hora_inicio}
                    onChange={(e) => setEditingSession({ ...editingSession, hora_inicio: e.target.value })}
                    className="edit-form-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="edit-form-group">
                  <label className="edit-form-label">Hora Fin</label>
                  <input
                    type="time"
                    value={editingSession.hora_fin}
                    onChange={(e) => setEditingSession({ ...editingSession, hora_fin: e.target.value })}
                    className="edit-form-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Ubicación (Sala)</label>
                <input
                  type="text"
                  value={editingSession.location}
                  onChange={(e) => setEditingSession({ ...editingSession, location: e.target.value })}
                  className="edit-form-input"
                  placeholder="sala 3"
                  disabled={isSubmitting}
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Actividad</label>
                <input
                  type="text"
                  value={editingSession.actividad}
                  onChange={(e) => setEditingSession({ ...editingSession, actividad: e.target.value })}
                  className="edit-form-input"
                  placeholder="Nombre de la actividad"
                  disabled={isSubmitting}
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Descripción</label>
                <textarea
                  value={editingSession.descripcion}
                  onChange={(e) => setEditingSession({ ...editingSession, descripcion: e.target.value })}
                  className="edit-form-textarea"
                  placeholder="Descripción de la sesión"
                  disabled={isSubmitting}
                />
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Cupos Disponibles</label>
                <input
                  type="number"
                  min="0"
                  value={editingSession.cuposDisponibles}
                  onChange={(e) => setEditingSession({ ...editingSession, cuposDisponibles: e.target.value })}
                  className="edit-form-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="edit-modal-footer">
            <button
              onClick={() => setShowEditModal(false)}
              disabled={isSubmitting}
              className="edit-btn-cancel"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveSession}
              disabled={isSubmitting}
              className={`edit-btn-save ${isEmerald ? 'emerald' : ''}`}
            >
              {isSubmitting ? (
                <><Loader className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal de confirmación
  if (showConfirmation && selectedSession) {
    const telefonoDisponible = usuario.telefono || phoneInput;
    const telefonoVacio = !telefonoDisponible || !String(telefonoDisponible).trim();
    
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '420px' }}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1rem', color: '#111827' }}>
              Confirmar Reserva
            </h3>
            
            {errorMsg && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                color: '#dc2626',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                <span>{errorMsg}</span>
              </div>
            )}
            
            <div style={{ 
              background: '#f3f4f6', 
              padding: '1rem', 
              borderRadius: '12px', 
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#374151' }}>
                <strong>Actividad:</strong> {activity.titulo}
              </p>
              <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#374151' }}>
                <strong>Fecha:</strong> {activeDate}
              </p>
              <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#374151' }}>
                <strong>Hora:</strong> {selectedSession.hora}
              </p>
              {selectedSession.location && (
                <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#374151' }}>
                  <strong>Ubicación:</strong> {selectedSession.location}
                </p>
              )}
            </div>

            {/* Campo de teléfono */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#374151',
                textAlign: 'left'
              }}>
                Número de Teléfono {telefonoVacio && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input
                type="tel"
                value={phoneInput || usuario.telefono || ''}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Ingresa tu número de teléfono"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: telefonoVacio ? '2px solid #fca5a5' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: '#111827',
                  transition: 'all 0.2s'
                }}
              />
              {telefonoVacio && (
                <p style={{
                  fontSize: '0.85rem',
                  color: '#dc2626',
                  marginTop: '0.5rem',
                  textAlign: 'left'
                }}>
                  El teléfono es requerido para completar la inscripción
                </p>
              )}
            </div>

            <p style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              ¿Estás seguro de que deseas confirmar esta reserva?
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReservation}
                disabled={isSubmitting || telefonoVacio}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: isEmerald ? '#10b981' : '#a855f7',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: (isSubmitting || telefonoVacio) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || telefonoVacio) ? 0.7 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <button onClick={onClose} className="modal-close-btn" disabled={isSubmitting}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800">{activity.titulo}</h3>
          
          <div className="date-buttons">
            {uniqueDates.map(date => (
              <button
                key={date}
                onClick={() => {
                  setActiveDate(date);
                  setErrorMsg(''); // Limpiar errores al cambiar fecha
                  setSelectedSession(null);
                }}
                className={`date-btn ${activeDate === date ? 'active' : ''} ${isEmerald ? 'emerald' : 'purple'}`}
                disabled={isSubmitting}
              >
                {date}
              </button>
            ))}
          </div>

          {/* Botón para crear nueva sesión (solo admin) */}
          {isAdminMode && (
            <div className="create-session-container">
              <button
                onClick={handleCreateClick}
                disabled={isSubmitting}
                className={`create-session-btn ${isEmerald ? 'emerald' : ''}`}
              >
                <Plus className="w-5 h-5" /> Crear Nueva Sesión
              </button>
            </div>
          )}

          <div className="horarios-section">
            {currentSessions && currentSessions.length > 0 ? (
              <div className="session-grid">
                {currentSessions.map((session, idx) => {
                  const isFull = session.cuposDisponibles === 0;
                  const isSelected = selectedSession?.id === session.id;
                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      <button
                        onClick={() => {
                          if (!isAdminMode) {
                            !isFull && setSelectedSession(session);
                            setErrorMsg(''); // Limpiar errores al seleccionar nuevo horario
                          }
                        }}
                        className={`session-slot ${isFull ? 'full' : ''} ${isSelected ? 'selected' : ''}`}
                        disabled={isSubmitting}
                        style={{ cursor: isAdminMode ? 'default' : (isFull ? 'not-allowed' : 'pointer') }}
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
                      
                      {/* Botones de administración */}
                      {isAdminMode && (
                        <div className="admin-action-buttons">
                          <button
                            onClick={() => handleEditClick(session)}
                            disabled={isSubmitting}
                            className="admin-btn-edit"
                            aria-label="Editar sesión"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(session)}
                            disabled={isSubmitting}
                            className="admin-btn-delete"
                            aria-label="Eliminar sesión"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No hay horarios disponibles para esta fecha
              </div>
            )}
          </div>

          {/* Mensajes de error y éxito */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              {successMsg}
            </div>
          )}
        </div>

        {/* Footer solo si no es modo admin */}
        {!isAdminMode && (
          <div className="modal-footer">
            <button 
              onClick={handleConfirmInscripcion} 
              className={`confirm-btn ${isEmerald ? '' : 'purple'} ${!selectedSession || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!selectedSession || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> GUARDANDO...
                </>
              ) : (
                <>
                  CONFIRMAR INSCRIPCIÓN <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
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
              <img src="/sf.jpeg" alt="Salud Fest Logo" className="welcome-logo" />
            </div>

            <div className="welcome-info-row">
              <div className="welcome-info-item">
                <MapPin size={18} className="info-icon" />
                <span>Toberín, Bogotá</span>
              </div>
              <div className="welcome-info-item">
                <Calendar size={18} className="info-icon" />
                <span>14 - 17 de Abril</span>
              </div>
            </div>

            <p className="welcome-description">
              Explora las actividades y reserva tu lugar en las experiencias que te gustaría vivir
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
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('home');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [misReservas, setMisReservas] = useState([]);
  const [showMyReservations, setShowMyReservations] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Verificar si hay usuario en localStorage al montar
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        const datosUsuario = JSON.parse(usuarioGuardado);
        setUsuario(datosUsuario);
        // Cargar reservas desde la API
        const cargarReservas = async () => {
          const inscripciones = await fetchInscripcionesFromApi(datosUsuario.document_number);
          const reservas = inscripciones.map(transformInscripcionToReserva);
          setMisReservas(reservas);
        };
        cargarReservas();
      } catch (err) {
        localStorage.removeItem('usuario');
      }
    }
  }, []);

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

  const refreshReservasFromApi = async () => {
    if (usuario) {
      // Recargar reservas del usuario
      const inscripciones = await fetchInscripcionesFromApi(usuario.document_number);
      const reservas = inscripciones.map(transformInscripcionToReserva);
      setMisReservas(reservas);
      
      // Recargar actividades para actualizar cuposDisponibles
      try {
        const activitiesFromApi = await fetchActividadesFromApi();
        setActividades(activitiesFromApi);
        
        // Si hay un selectedActivity, actualizar con los datos nuevos
        if (selectedActivity) {
          const actividadActualizada = activitiesFromApi.find(a => a.id === selectedActivity.id);
          if (actividadActualizada) {
            setSelectedActivity(actividadActualizada);
          }
        }
      } catch (error) {
      }
    }
  };

  const handleSelectSession = async (session) => {
    const newRegistration = {
      id: Date.now(),
      activityId: selectedActivity.id,
      activity: selectedActivity.titulo,
      session: session,
      timestamp: new Date().toLocaleString('es-ES')
    };
    setRegistrations([...registrations, newRegistration]);
    // Recargar reservas del usuario actual desde la API
    const inscripciones = await fetchInscripcionesFromApi(usuario.document_number);
    const reservas = inscripciones.map(transformInscripcionToReserva);
    setMisReservas(reservas);
    handleCloseModal();
  };

  const handleLoginSuccess = async (userData) => {
    setUsuario(userData);
    // Cargar reservas del usuario desde la API
    const inscripciones = await fetchInscripcionesFromApi(userData.document_number);
    const reservas = inscripciones.map(transformInscripcionToReserva);
    setMisReservas(reservas);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    setUsuario(null);
    setMisReservas([]);
    setCurrentView('home');
    setShowMyReservations(false);
  };

  // Si no hay usuario autenticado, mostrar login
  if (!usuario) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Panel de Mis Reservas
  if (showMyReservations) {
    return (
      <div className="app-wrapper">
        <div className="user-header">
          <div className="user-greeting">
            <h2>Mis Reservas</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="logout-button" 
              onClick={() => setShowMyReservations(false)}
              title="Volver a actividades"
            >
              <ArrowLeft size={20} />
            </button>
            <button 
              className="logout-button" 
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          {misReservas.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              borderRadius: '12px',
            }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No tienes reservas aún</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {misReservas.map(reserva => (
                <div key={reserva.id} style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                    {reserva.actividad}
                  </h3>

                  <div style={{ 
                    background: '#f9fafb',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    color: '#374151'
                  }}>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Fecha:</strong> {reserva.fecha}
                    </p>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Hora:</strong> {reserva.hora}
                    </p>
                    {reserva.location && (
                      <p style={{ margin: '0.5rem 0' }}>
                        <strong>Ubicación:</strong> {reserva.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="user-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
          {usuario?.foto && (
            <img 
              src={usuario.foto} 
              alt={usuario.nombre}
              className="user-avatar"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="user-greeting">
            <h2>¡Hola, <span className="user-name">{usuario.nombre}</span>!</h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {console.log('Debug - document_number:', usuario?.document_number, 'Type:', typeof usuario?.document_number) || null}
          {String(usuario?.document_number) === '1020741340' && (
            <>
              <button 
                className="logout-button" 
                onClick={() => navigate('/admin')} 
                title="Panel de administración"
              >
                <UserStar size={20} />
              </button>
              <button 
                className={`logout-button ${isAdminMode ? 'admin-mode-active' : ''}`}
                onClick={() => setIsAdminMode(!isAdminMode)}
                title={isAdminMode ? 'Desactivar modo edición' : 'Activar modo edición'}
              >
                <Edit size={20} />
                {isAdminMode && <span>Modo Edición</span>}
              </button>
            </>
          )}
          <button 
            className="logout-button" 
            onClick={() => setShowMyReservations(true)}
            title="Ver mis reservas"
          >
            <span>Mis Reservas ({misReservas.length})</span>
          </button>
          <button 
            className="logout-button" 
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={20} />  
          </button>
        </div>
      </div>
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
        usuario={usuario}
        onReservationSuccess={refreshReservasFromApi}
        isAdminMode={isAdminMode}
      />
    </div>
  );
};

export default Activities;
