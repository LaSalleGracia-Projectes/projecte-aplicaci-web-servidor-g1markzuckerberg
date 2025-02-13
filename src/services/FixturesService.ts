import axios from "axios";
import { roundMapping } from "../constants/roundMapping.js"; // Asegúrate de que este archivo exista
import type Fixture from "../types/Fixture";
import type { RoundsApiResponse } from "../types/RoundsApiResponse";

const apiToken = process.env.API_TOKEN;

async function getFixturesByRoundNumber(roundNumber: string): Promise<Fixture[]> {
    // Buscar el ID de la jornada a partir del número
    const roundId = roundMapping[roundNumber];
    if (!roundId) {
        throw new Error(`No se encontró una jornada con el número: ${roundNumber}`);
    }

    // Construir la URL
    const url = `https://api.sportmonks.com/v3/football/rounds/${roundId}?api_token=${apiToken}&include=fixtures`;

    // Hacer la petición con Axios, tipando la respuesta
    const response = await axios.get<RoundsApiResponse>(url);

    // Extraer la propiedad fixtures (asegúrate de que tu interfaz RoundData la tenga)
    const { fixtures } = response.data.data;

    // Mapear los fixtures tipando el parámetro para evitar el error "implicitly has an 'any' type"
    return fixtures.map((fixture: Fixture) => ({
        id: fixture.id,
        name: fixture.name,
        result_info: fixture.result_info,
        starting_at_timestamp: fixture.starting_at_timestamp
    }));
}

/* Ejemplo de uso 
async function testGetFixtures() {
    try {
        // Por ejemplo, obtenemos los fixtures de la jornada 23
        const roundNumber = "22";
        const fixtures = await getFixturesByRoundNumber(roundNumber);
        console.log(`Fixtures para la jornada ${roundNumber}:`);
        console.log(fixtures);
    } catch (error) {
        console.error("Error al obtener los fixtures:", error);
    }
}

testGetFixtures();
*/
export { getFixturesByRoundNumber };