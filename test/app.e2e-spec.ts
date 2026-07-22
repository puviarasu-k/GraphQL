import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

interface ErrorEnvelope {
  success: boolean;
  statusCode: number;
  error: string;
  message: string | string[];
}

// NOTE: this suite boots the real AppModule, which connects to MySQL and
// Redis per the DB_HOST/REDIS_HOST env vars (see .env.example). It requires
// those services to be reachable; it is not mocked, by design, since it's
// meant to exercise the real wiring end to end.
describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it("/ (GET) is a public health check, not wrapped in the API envelope or prefix", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello World!");
  });

  it("/api/v1/users/me (GET) requires authentication", () => {
    return request(app.getHttpServer())
      .get("/api/v1/users/me")
      .expect(401)
      .expect((res) => {
        const body = res.body as ErrorEnvelope;
        expect(body.success).toBe(false);
        expect(body.statusCode).toBe(401);
      });
  });

  it("/api/v1/auth/login (POST) rejects an invalid mobile number with the standard error envelope", () => {
    return request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ mobile: "not-a-number" })
      .expect(400)
      .expect((res) => {
        const body = res.body as ErrorEnvelope;
        expect(body.success).toBe(false);
        expect(body.statusCode).toBe(400);
        expect(body.error).toBeDefined();
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
