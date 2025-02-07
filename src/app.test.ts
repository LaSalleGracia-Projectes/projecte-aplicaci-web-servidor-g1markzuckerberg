import request, {type Response} from 'supertest';
import app from '.';

describe('Given a GET \'/\' endpoint ', () => {
	describe('When it receives a request', () => {
		test('Then it should send a response with status 200 and message \'Hello World!\'', async () => {
			const expectedMessage = 'Hello World!';
			const expectedStatus = 200;

			const response: Response = await request(app).get('/').expect(expectedStatus);

			const {message} = response.body as {message: string};

			expect(message).toStrictEqual(expectedMessage);
		});
	});
});
