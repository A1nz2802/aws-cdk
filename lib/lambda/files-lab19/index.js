exports.handler = async (event) => {
  console.log('Evento recibido:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    body: `Evento recibido: ${JSON.stringify(event, null, 2)}`
  };
};