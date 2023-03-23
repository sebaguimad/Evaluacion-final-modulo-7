const cors = require('cors');

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json()); 
const port = 3000;

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Paji890',
  database: 'm7 Evaluacion2.datos.sql',
  port: 5432,
});

app.get('/paises', async (req, res) => {
  const { limit = 5, offset = 0 } = req.query;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const query = `
      SELECT p.nombre, p.continente, p.poblacion, pp.pib_2019, pp.pib_2020
      FROM paises p
      JOIN paises_pib pp ON p.nombre = pp.nombre
      LIMIT $1
      OFFSET $2;
    `;

    const { rows } = await client.query(query, [limit, offset]);
    await client.query('COMMIT');

    res.json(rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en la consulta:', error);
    res.status(500).send('Error en el servidor');
  } finally {
    client.release();
  }
});


app.post('/paises', async (req, res) => {
  const { nombre, continente, poblacion, pib_2019, pib_2020 } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertPaisesQuery = `
      INSERT INTO paises (nombre, continente, poblacion)
      VALUES ($1, $2, $3);
    `;
    await client.query(insertPaisesQuery, [nombre, continente, poblacion]);

    const insertPaisesPibQuery = `
      INSERT INTO paises_pib (nombre, pib_2019, pib_2020)
      VALUES ($1, $2, $3);
    `;
    await client.query(insertPaisesPibQuery, [nombre, pib_2019, pib_2020]);

    try {
      const insertOrUpdatePaisesDataWebQuery = `
        INSERT INTO paises_data_web (nombre_pais, accion)
        VALUES ($1, 1)
        ON CONFLICT (nombre_pais) DO UPDATE
        SET accion = paises_data_web.accion + 1;
      `;
      await client.query(insertOrUpdatePaisesDataWebQuery, [nombre]);
    } catch (error) {
      console.warn('Advertencia al insertar o actualizar en paises_data_web:', error);
    }

    await client.query('COMMIT');
    res.status(201).send('País creado correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en la consulta:', error);
    res.status(500).send('Error en el servidor');
  } finally {
    client.release();
  }
});



app.delete('/paises/:nombre', async (req, res) => {
  const nombre = req.params.nombre;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deletePaisesDataWebQuery = `
      DELETE FROM paises_data_web
      WHERE nombre_pais = $1;
    `;
    await client.query(deletePaisesDataWebQuery, [nombre]);

    const deletePaisesPibQuery = `
      DELETE FROM paises_pib
      WHERE nombre = $1;
    `;
    await client.query(deletePaisesPibQuery, [nombre]);

    const deletePaisesQuery = `
      DELETE FROM paises
      WHERE nombre = $1;
    `;
    await client.query(deletePaisesQuery, [nombre]);

    await client.query('COMMIT');
    res.status(200).send('País eliminado correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en la consulta:', error);
    res.status(500).send('Error en el servidor');
  } finally {
    client.release();
  }
});



app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});


