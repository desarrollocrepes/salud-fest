import './Activities.css';
import React, { useState, useEffect, useMemo } from 'react';
import { Check, Palette, Clapperboard, ChefHat, Handshake, Bird, Puzzle, Bed, ArrowLeft, Users, CheckCircle, X, Info, ChevronDown, Apple, Smile, Eye, Flower, Layers, Moon, Rose, Telescope, Utensils, Projector, User, MapPin, Calendar} from 'lucide-react';

const IconMap = {
  Palette: Palette,
  Clapperboard: Clapperboard,
  ChefHat: ChefHat,
  Handshake: Handshake,
  Bird: Bird,
  Puzzle: Puzzle,
  Bed: Bed, 
  Apple: Apple,
  Smile: Smile,
  Eye: Eye,
  Flower: Flower,
  Layers: Layers,
  Moon: Moon,
  Rose: Rose,
  Telescope: Telescope,
  Utensils: Utensils,
  Projector: Projector,
  User: User
};

const ICON_ALIASES = {
  apple: 'Apple',
  smile: 'Smile',
  eye: 'Eye',
  flower: 'Flower',
  palette: 'Palette',
  chefhat: 'ChefHat',
  clapperboard: 'Clapperboard',
  handshake: 'Handshake',
  bed: 'Bed',
  bird: 'Bird',
  puzzle: 'Puzzle',
  layers: 'Layers',
  moon: 'Moon',
  rose: 'Rose',
  telescope: 'Telescope',
  utensils: 'Utensils',
  projector: 'Projector',
  user: 'User',
  info: 'Info',
  chef_hat: 'ChefHat',
  'chef-hat': 'ChefHat'
};

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

const normalizeIconCandidate = (value) => {
  if (!value || typeof value !== 'string') return '';
  const noExtension = value.replace(/\.[^/.]+$/, '');
  return noExtension.trim();
};

const resolveIconKey = (...candidates) => {
  for (const candidate of candidates) {
    const iconCandidate = normalizeIconCandidate(candidate);
    if (!iconCandidate) continue;

    if (IconMap[iconCandidate]) return iconCandidate;

    const normalized = iconCandidate.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const aliasMatch = ICON_ALIASES[normalized];
    if (aliasMatch && IconMap[aliasMatch]) return aliasMatch;
  }

  return 'Info';
};

const getIconName = (rawIcon) => {
  if (typeof rawIcon === 'string') return resolveIconKey(rawIcon);

  const iconAttributes = getAttributes(rawIcon?.data);
  return resolveIconKey(
    iconAttributes?.alternativeText,
    iconAttributes?.name,
    iconAttributes?.caption,
    iconAttributes?.hash
  );
};

const normalizeHorarios = (horarios) => {
  const horarioItems = Array.isArray(horarios)
    ? horarios
    : Array.isArray(horarios?.data)
      ? horarios.data
      : [];

  return horarioItems.map((horarioItem) => {
    const horario = getAttributes(horarioItem);
    return {
      hora: horario.hora || '',
      actividad: horario.actividad || '',
      descripcion: horario.descripcion || '',
      location: horario.location || horario.ubicacion || '',
      cuposDisponibles: Number.isFinite(horario.cuposDisponibles) ? horario.cuposDisponibles : 0
    };
  });
};

const normalizeSesiones = (sesiones) => {
  const sessionItems = Array.isArray(sesiones)
    ? sesiones
    : Array.isArray(sesiones?.data)
      ? sesiones.data
      : [];

  return sessionItems.map((sessionItem) => {
    const session = getAttributes(sessionItem);
    return {
      dia: session.dia || '',
      horarios: normalizeHorarios(session.horarios)
    };
  });
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
    icon: resolveIconKey(
      actividad.icon,
      actividad.icono,
      actividad.iconName,
      actividad.iconoLucide,
      getIconName(actividad.icon)
    ),
    descripcion: actividad.descripcion || '',
    cupoMax: Number.isFinite(actividad.cupoMax) ? actividad.cupoMax : 0,
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

// DATA ACTIVIDADES DE BIENESTAR Y ACADEMIA DE LAS ARTES
const actividades = [
  // ACTIVIDADES DE BIENESTAR
  {
    id: 1,
    titulo: "Aliméntate",
    categoria: "Bienestar", // true or false - defsult null true academia
    theme: "emerald",
    icon: "Apple",
    descripcion: "¿Te gustaría aprender algunas preparaciones sencillas para cuidar tu salud?",
    cupoMax: 15,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "8:30 - 9:00 a.m.", actividad: "Brochetas de frutas", cuposDisponibles: 15 },
          { hora: "9:30 - 10:00 a.m.", actividad: "Brochetas de frutas", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "15 Abr.", 
        horarios: [
          { hora: "8:30 - 9:30 a.m.", actividad: "Parfait", cuposDisponibles: 15 },
          { hora: "9:30 - 10:00 a.m.", actividad: "Parfait", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "16 Abr.", 
        horarios: [
          { hora: "3:00 - 3:30 p.m.", actividad: "Gelatina Creativa", cuposDisponibles: 15 },
          { hora: "4:00 - 4:30 p.m.", actividad: "Gelatina Creativa", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "17 Abr.", 
        horarios: [
          { hora: "3:00 - 3:30 p.m.", actividad: "Brochetas saladas", cuposDisponibles: 15 },
          { hora: "4:00 - 4:30 p.m.", actividad: "Brochetas saladas", cuposDisponibles: 15 }
        ]
      }
    ]
  },
  {
    id: 2,
    titulo: "Sonrisas Sanas",
    categoria: "Bienestar",
    theme: "emerald",
    icon: "Smile",
    descripcion: "Descubre la importancia de cuidar tu salud oral y aprende hábitos sencillos para mantener una sonrisa sana, fuerte y llena de bienestar",
    cupoMax: 15,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "2:00 - 3:00 p.m.", actividad: "Sonrisas Sanas", location: "Sala 6", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "16 Abr.", 
        horarios: [
          { hora: "8:00 - 9:00 a.m.", actividad: "Sonrisas Sanas", location: "Sala 3", cuposDisponibles: 15 }
        ]
      }
    ]
  },
  {
    id: 3,
    titulo: "Obsérvate",
    categoria: "Bienestar",
    theme: "emerald",
    icon: "Eye",
    descripcion: "Te invitamos a vivir una experiencia de Confort Visual. Descubre cómo pequeños hábitos pueden mejorar tu salud visual.\nTrae tu fórmula y recibe orientación personalizada",
    cupoMax: 15,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "7:00 - 7:15 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "7:15 - 7:30 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "7:30 - 7:45 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "7:45 - 8:00 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 }
        ]
      },
      { 
        dia: "15 Abr.", 
        horarios: [
          { hora: "2:00 - 2:15 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "2:15 - 2:30 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "2:30 - 2:45 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "2:45 - 3:00 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "3:00 - 3:15 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "3:15 - 3:30 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "3:30 - 3:45 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "3:45 - 4:00 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "4:00 - 4:15 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "4:15 - 4:30 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "4:30 - 4:45 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "4:45 - 5:00 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 }
        ]
      },
      { 
        dia: "16 Abr.", 
        horarios: [
          { hora: "10:00 - 10:15 a.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "10:15 - 10:30 a.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "10:30 - 10:45 a.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "10:45 - 11:00 a.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "11:00 - 11:15 a.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "11:15 - 11:30 a.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "11:30 - 11:45 a.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "11:45 - 12:00 m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "12:00 - 12:15 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "12:15 - 12:30 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "12:30 - 12:45 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 },
          { hora: "12:45 - 1:00 p.m.", actividad: "Confort Visual", location: "Sala 3", cuposDisponibles: 1 }
        ]
      }
    ]
  },

  // ACTIVIDADES DE ACADEMIA DE LAS ARTES
  {
    id: 4,
    titulo: "Flores de Bach",
    categoria: "Academia de las Artes",
    theme: "purple",
    icon: "Flower",
    descripcion: "¿Te gustaría explorar cómo las emociones influyen en tu bienestar? Crea una esencia floral personalizada para ti",
    cupoMax: 12,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "10:00 a.m. - 12:00 m", actividad: "Flores de Bach", location: "Sala 7", cuposDisponibles: 12 }
        ]
      },
      { 
        dia: "15 Abr.", 
        horarios: [
          { hora: "10:00 a.m. - 12:00 m", actividad: "Flores de Bach", location: "Sala 7", cuposDisponibles: 12 }
        ]
      }
    ]
  },
  {
    id: 5,
    titulo: "Constelaciones familiares & Collage",
    categoria: "Academia de las Artes",
    theme: "purple",
    icon: "Palette",
    descripcion: "Desde el arte y el collage exploraremos nuestra historia familiar para abrir nuevas miradas de bienestar. \n¿Qué historias de tu familia siguen influyendo en tu vida hoy?",
    cupoMax: 15,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "4:30 - 6:30 p.m.", actividad: "Constelaciones Familiares & Collage", location: "Sala 10", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "16 Abr.", 
        horarios: [
          { hora: "4:30 - 6:30 p.m.", actividad: "Constelaciones Familiares & Collage", location: "Sala 10", cuposDisponibles: 15 }
        ]
      }
    ]
  },
  {
    id: 6,
    titulo: "Despierta tus sentidos a través del alimento",
    categoria: "Academia de las Artes",
    theme: "purple",
    icon: "ChefHat",
    descripcion: "¿Te gustaría vivir una experiencia de degustación? Explora sabores, conecta con los sentidos y redescubre el alimento",
    cupoMax: 20,
    sesiones: [
      { 
        dia: "16 Abr.", 
        horarios: [
          { hora: "9:00 - 10:00 a.m.", actividad: "Despierta tus Sentidos", location: "CocinArte", cuposDisponibles: 20 }
        ]
      },
      { 
        dia: "17 Abr.", 
        horarios: [
          { hora: "9:00 - 10:00 a.m.", actividad: "Despierta tus Sentidos", location: "CocinArte", cuposDisponibles: 20 }
        ]
      }
    ]
  },
  {
    id: 7,
    titulo: "Documental: Zonas Azules",
    categoria: "Academia de las Artes",
    theme: "purple",
    icon: "Clapperboard",
    descripcion: "Descubre los secretos de las mujeres y hombres más longevos del mundo. \nProyección con crispetas 🍿",
    cupoMax: 15,
    sesiones: [
      { 
        dia: "17 Abr.", 
        horarios: [
          { hora: "12:00 - 1:00 p.m.", actividad: "Documental Zonas Azules", location: "Sala 10", cuposDisponibles: 12 },
          { hora: "1:30 - 2:30 p.m.", actividad: "Documental Zonas Azules", location: "Sala 10", cuposDisponibles: 12 }
        ]
      }
    ]
  },
  {
    id: 8,
    titulo: "Constelaciones familiares",
    categoria: "Academia de las Artes",
    theme: "purple",
    icon: "Handshake",
    descripcion: "Un espacio para mirar tu historia familiar con respeto y gratitud. Reconoce lo recibido y abre nuevas posibilidades de bienestar en tu vida",
    cupoMax: 15,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "7:00 - 8:30 p.m.", actividad: "Constelaciones Familiares", location: "Sala 7", cuposDisponibles: 25 }
        ]
      }
    ]
  },
  {
    id: 9,
    titulo: "SPA Dormir",
    categoria: "Academia de las Artes",
    theme: "purple",
    icon: "Bed",
    descripcion: "¿Te regalarías 20 minutos para recargar tu energía? \nDisfruta una siesta guiada y vuelve a tu jornada con mayor bienestar",
    cupoMax: 12,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "12:00 - 12:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:20 - 12:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:40 - 1:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:00 - 1:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:20 - 1:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:40 - 2:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:00 - 2:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:20 - 2:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:40 - 3:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 }
        ]
      },
      { 
        dia: "15 Abr.", 
        horarios: [
          { hora: "12:00 - 12:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:20 - 12:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:40 - 1:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:00 - 1:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:20 - 1:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:40 - 2:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:00 - 2:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:20 - 2:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:40 - 3:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 }
        ]
      },
      { 
        dia: "16 Abr.", 
        horarios: [
          { hora: "11:20 - 11:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "11:40 - 12:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:00 - 12:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:20 - 12:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:40 - 1:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:00 - 1:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:20 - 1:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:40 - 2:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:00 - 2:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:20 - 2:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:40 - 3:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 }
        ]
      },
      { 
        dia: "17 Abr.", 
        horarios: [
          { hora: "11:20 - 11:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "11:40 - 12:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:00 - 12:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:20 - 12:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "12:40 - 1:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:00 - 1:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:20 - 1:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "1:40 - 2:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:00 - 2:20 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:20 - 2:40 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 },
          { hora: "2:40 - 3:00 p.m.", actividad: "SPA Dormir", cuposDisponibles: 12 }
        ]
      }
    ]
  },
  {
    id: 10,
    titulo: "Rincón de paz",
    categoria: "Academia de las Artes",
    theme: "purple",
    icon: "Bird",
    descripcion: "Un espacio para detenerte un momento, respirar y reconectar con tu cuerpo y tu mente. \nVisítalo en cualquier momento del día durante la semana para regalarte una pausa",
    cupoMax: 15,
    sesiones: [
      { 
        dia: "14 Abr.", 
        horarios: [
          { hora: "10:30 a.m - 10:45 a.m.", actividad: "Calma: Paisajes sonoros", descripcion: "¿Te gustaría detenerte unos minutos para relajarte escuchando paisajes sonoros que calman la mente y el cuerpo?", location: "Sala 10", cuposDisponibles: 15 },
          { hora: "3:00 a.m - 3:15 p.m.", actividad: "Calma: Paisajes sonoros", descripcion: "¿Te gustaría detenerte unos minutos para relajarte escuchando paisajes sonoros que calman la mente y el cuerpo?", location: "Sala 10", cuposDisponibles: 15 },
          { hora: "", actividad: "Echemos cuento: Lectura silenciosa", descripcion: "¿Te animas a regalarte un momento de lectura en silencio o compartir un libro a través de trueque o donación?", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "15 Abr.", 
        horarios: [
          { hora: "10:30 a.m - 10:45 a.m.", actividad: "Calma: Paisajes sonoros", descripcion: "¿Te gustaría detenerte unos minutos para relajarte escuchando paisajes sonoros que calman la mente y el cuerpo?", location: "Sala 10", cuposDisponibles: 15 },
          { hora: "", actividad: "Echemos cuento: Lectura silenciosa", descripcion: "¿Te animas a regalarte un momento de lectura en silencio o compartir un libro a través de trueque o donación?", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "16 Abr.", 
        horarios: [
          { hora: "3:00 - 3:15 p.m.", actividad: "Calma: Paisajes sonoros", descripcion: "¿Te gustaría detenerte unos minutos para relajarte escuchando paisajes sonoros que calman la mente y el cuerpo?", location: "Sala 10", cuposDisponibles: 15 },
          { hora: "", actividad: "Echemos cuento: Lectura silenciosa", descripcion: "¿Te animas a regalarte un momento de lectura en silencio o compartir un libro a través de trueque o donación?", cuposDisponibles: 15 }
        ]
      },
      { 
        dia: "17 Abr.", 
        horarios: [
          { hora: "3:00 - 3:15 p.m.", actividad: "Calma: Paisajes sonoros", descripcion: "¿Te gustaría detenerte unos minutos para relajarte escuchando paisajes sonoros que calman la mente y el cuerpo?", location: "Sala 10", cuposDisponibles: 15 },
          { hora: "", actividad: "Echemos cuento: Lectura silenciosa", descripcion: "¿Te animas a regalarte un momento de lectura en silencio o compartir un libro a través de trueque o donación?", cuposDisponibles: 15 }
        ]
      }
    ]
  }
];

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
  const ActivityIcon = IconMap[activity.icon] || Info;
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
                      <div className="flex justify-between items-start mb-1">
                        <span className="session-time">{session.hora}</span>
                      </div>
                      {session.actividad && (
                        <div className="text-xs text-gray-600 mb-2">{session.actividad}</div>
                      )}
                      {session.descripcion && (
                        <div className="text-xs text-gray-700 mb-2 italic">{session.descripcion}</div>
                      )}
                      {session.location && (
                        <div className="text-xs text-gray-500 mb-2">{session.location}</div>
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
  const ActivityIcon = IconMap[activity.icon] || Info;
  return (
    <div className={`activity-card ${isEmerald ? 'emerald' : 'purple'}`}>
      <div className={`activity-card-icon-wrapper ${isEmerald ? 'emerald' : 'purple'}`}>
        <ActivityIcon size={30} strokeWidth={2} />
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
            <button
              className="welcome-close-btn"
              onClick={() => setIsWelcomeOpen(false)}
              aria-label="Cerrar bienvenida"
            >
              <X size={20} />
            </button>

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
  const ActivityIcon = IconMap[selectedActivity.icon] || Info;

  return (
    <div className="saludfest-view">
      <button onClick={onBackToHome} className="back-btn">
        <ArrowLeft className="w-4 h-4" /> VOLVER
      </button>

      <div className={`activity-detail ${isEmerald ? 'emerald' : 'purple'}`}>
        <div className={`activity-detail-icon ${isEmerald ? 'emerald' : 'purple'}`}>
          <ActivityIcon size={100} strokeWidth={1} />
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