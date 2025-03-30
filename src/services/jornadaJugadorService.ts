import { processRoundFantasyPoints } from './fantasyService.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { PlayerScore } from '../types/PlayerScore.js';
dotenv.config();


// Se usan los operadores ! para asegurar que las variables de entorno no sean null ni undefined.
const supabaseUrl: string = process.env.SUPABASE_URL2!;
const supabaseKey: string = process.env.SUPABASE_KEY2!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Interfaz para representar una fila de la tabla "jugadores".
 */
// interface PlayerRow {
//     id: number;
// }

/**
 * Procesa las puntuaciones fantasy de una ronda y las inserta en la tabla "jornada_jugador".
 *
 * Primero se obtienen las puntuaciones llamando a `processRoundFantasyPoints`, luego se consulta la
 * tabla "jugadores" para obtener los IDs existentes y se filtran los resultados. Solo se insertarán
 * aquellos jugadores que ya existan en la tabla `jugadores`.
 *
 * @param {number} roundId - Identificador de la ronda.
 * @returns {Promise<PlayerScore[]>} Promesa que se resuelve con los resultados filtrados (jugadores existentes).
 * @throws {Error} Si ocurre un error durante el proceso o la inserción en Supabase.
 */
export const uploadRoundFantasyPoints = async (roundId: number): Promise<PlayerScore[]> => {
    // Obtiene los puntos fantasy de la ronda.
    const results: PlayerScore[] = await processRoundFantasyPoints(roundId);

    // Consulta la tabla "jugadores" para obtener los IDs existentes.
    // Se pasan dos argumentos de tipo: uno para la estructura de la tabla y otro para la fila retornada.
    const { data: existingPlayers, error: selectError } = await supabase
        .from('jugadores')
        .select('id');

    if (selectError) {
        throw new Error(`Error retrieving existing players: ${selectError.message}`);
    }

    // Si no hay datos, usamos un arreglo vacío para evitar valores undefined.
    // eslint-disable-next-line @typescript-eslint/consistent-generic-constructors, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
    const existingIds: Set<number> = new Set((existingPlayers ?? []).map(p => p.id));

    // Filtra los resultados para retener solo aquellos jugadores que existen en la tabla "jugadores".
    const filteredResults = results.filter(result => existingIds.has(result.player_id));

    // Prepara los datos para insertar en la tabla "jornada_jugador".
    // Se deshabilitan las reglas de naming convention para estas propiedades, ya que la tabla espera snake_case.
    const insertData = filteredResults.map(result => ({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        jornada_id: roundId,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        jugador_id: result.player_id,
        points: result.points,
    }));

    // Inserta los registros filtrados en Supabase.
    const { error } = await supabase
        .from('jornada_jugador')
        .upsert(insertData, { onConflict: 'jornada_id,jugador_id' });

    if (error) {
        throw new Error(`Error inserting records into Supabase: ${error.message}`);
    }

    // Retorna el arreglo filtrado original, que cumple con la interfaz PlayerScore.
    return filteredResults;
};
