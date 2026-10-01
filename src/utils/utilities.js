export const SIGN_DICTIONARY = [
  "Mão Aberta",
  "Mão Fechada (Punho)",
  "Fixe / Positivo",
  "Vitória / Paz"
];

/**
 * Classifica a posição básica dos dedos com base nos pontos de referência (landmarks) do MediaPipe.
 * Cada dedo tem pontos de 0 a 20:
 * Polegar: 4 | Indicador: 8 | Médio: 12 | Anelar: 16 | Mindinho: 20
 */
export function classifyHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const isIndexUp = landmarks[8].y < landmarks[6].y;
  const isMiddleUp = landmarks[12].y < landmarks[10].y;
  const isRingUp = landmarks[16].y < landmarks[14].y;
  const isPinkyUp = landmarks[20].y < landmarks[18].y;
  const isThumbUp = landmarks[4].y < landmarks[3].y;

  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
    return "Mão Aberta";
  }

  if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp && isThumbUp) {
    return "Fixe / Positivo";
  }

  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
    return "Vitória / Paz";
  }

  if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return "Mão Fechada (Punho)";
  }

  return null;
}