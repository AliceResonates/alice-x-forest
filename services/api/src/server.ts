import { createApp } from "./app";

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Alice x Forest API läuft auf Port ${PORT}`);
});
