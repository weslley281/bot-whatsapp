import * as fs from 'fs';
import * as qrcode from 'qrcode-terminal';
import { Client, MessageMedia, Chat, Message } from 'whatsapp-web.js';
import express, { Request, Response } from 'express';
import cors from 'cors';

const SESSION_FILE_PATH = './session.json';
const MEDIA_FOLDER_PATH = './media';

let ws: Client | undefined;
let dataSession: any;

const withSession = () => {
  dataSession = require(SESSION_FILE_PATH);
  ws = new Client({
    session: dataSession,
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }, // Opcional, para contornar problemas de sandbox
  });
  ws.on('ready', () => console.log('Cliente está pronto!'));
  ws.on('auth_failure', () => {
    console.log(
      '** O erro de autenticação regenera o QRCODE (Excluir o arquivo session.json) **'
    );
    fs.unlinkSync(SESSION_FILE_PATH);
  });
  ws.initialize();
};

const withOutSession = () => {
  ws = new Client({
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }, // Opcional, para contornar problemas de sandbox
  });
  ws.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
  });
  ws.on('ready', () => console.log('Cliente está pronto!'));
  ws.on('auth_failure', () => {
    console.log(
      '** O erro de autenticação regenera o QRCODE (Excluir o arquivo session.json) **'
    );
    fs.unlinkSync(SESSION_FILE_PATH);
  });
  ws.on('authenticated', (session) => {
    dataSession = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
      if (err) console.log(err);
    });
  });
  ws.initialize();
};

fs.existsSync(SESSION_FILE_PATH) ? withSession() : withOutSession();

const sendMessage = async (
  number: string,
  text: string = 'Olá, eu sou um BOT'
) => {
  if (ws) {
    number = `${number}@c.us`;
    const chat = await ws.getChatById(number);
    chat?.sendMessage(text);
  }
};

const sendMessageMedia = async (
  number: string,
  fileName: string,
  caption: string
) => {
  if (ws) {
    const chat = await ws.getChatById(`${number}@c.us`);
    const media = MessageMedia.fromFilePath(`${MEDIA_FOLDER_PATH}/${fileName}`);
    chat?.sendMessage(media, { caption: caption });
  }
};

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true }));

const sendText = (req: Request, res: Response) => {
  const { message, number } = req.body;
  sendMessage(number, message);
  res.send({ status: 'Mensagem enviada!' });
};

const sendMedia = (req: Request, res: Response) => {
  const { number, fileName, caption } = req.body;
  sendMessageMedia(number, fileName, caption);
  res.send({ status: 'Mensagem multimídia enviada!' });
};

app.post('/send', sendText);
app.post('/sendMedia', sendMedia);

app.post('/webhook', async (req: Request, res: Response) => {
  const { body } = req;
  const { from, body: messageBody } = body as Message;

  // Adicione sua lógica de processamento de mensagens aqui
  const response = await processReceivedMessage(from, messageBody);

  // Envie uma resposta de volta (opcional)
  res.send({ status: 'Mensagem recebida!' });
});

const processReceivedMessage = async (from: string, message: string) => {
  // Verifique o remetente (from) ou qualquer outro critério de sua escolha
  // e determine a resposta com base na mensagem recebida

  let response = '';

  if (message.toLowerCase().includes('oi')) {
    response = 'Olá! Como posso ajudar?';
  } else if (message.toLowerCase().includes('preço')) {
    response = 'O preço do produto X é R$ 100.';
  } else {
    response = 'Desculpe, não entendi o que você disse.';
  }

  // Envie a resposta de volta
  await sendMessage(from, response);
};

app.listen(5000, () => console.log('Servidor pronto na porta 5000!'));
