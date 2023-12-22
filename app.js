const express = require('express');
const session = require('express-session');
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');
const ejs = require('ejs');

// Replace these with your actual credentials
const clientId = '5d040c4ac4054dc9bf70631c98ce92bb';
const clientSecret = '77c16202a80f48a6a6f7e45e0b6bd5af';
const redirectUri = 'http://localhost:8888/callback';

const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri
});

app.use(express.static('public'));

// Initialize the session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: true,
  saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/callback', async (req, res) => {
  const { code } = req.query; // Extract the authorization code from the query parameters

  try {
    // Exchange authorization code for access and refresh tokens
    const data = await spotifyApi.authorizationCodeGrant(code);

    const accessToken = data.body['access_token'];
    const refreshToken = data.body['refresh_token'];

    // Store the user's access token and refresh token in the session
    req.session.access_token = accessToken;
    req.session.refresh_token = refreshToken;

    // Set the access token for future API requests
    spotifyApi.setAccessToken(accessToken);

    // Redirect back to the main page
    res.redirect('/');
  } catch (error) {
    console.error('Error:', error);
    res.send('An error occurred. Check your console for details.');
  }
});

app.get('/', async (req, res) => {
  if (!req.session.access_token) {
    const authorizeURL = spotifyApi.createAuthorizeURL(['user-top-read'], 'state');
    return res.redirect(authorizeURL);
  }

  try {
    // Use access token to get data
    spotifyApi.setAccessToken(req.session.access_token);

    // Get the user's top artists for all time (changed time_range)
    const topArtistsAllTimeResponse = await spotifyApi.getMyTopArtists({ limit: 12, time_range: 'long_term' });
    const topArtistsAllTime = topArtistsAllTimeResponse.body.items;

    // Get the user's top artists for the past year
    const topArtistsYearResponse = await spotifyApi.getMyTopArtists({ limit: 12, time_range: 'medium_term' });
    const topArtistsYear = topArtistsYearResponse.body.items;

    // Get the user's top artists for the past month
    const topArtistsMonthResponse = await spotifyApi.getMyTopArtists({ limit: 12, time_range: 'short_term' });
    const topArtistsMonth = topArtistsMonthResponse.body.items;


    // Get the user's top tracks for all time (changed time_range)
    const topTracksAllTimeResponse = await spotifyApi.getMyTopTracks({ limit: 12, time_range: 'long_term' });
    const topTracksAllTime = topTracksAllTimeResponse.body.items;

    // Get the user's top tracks for past year
    const topTracksYearResponse = await spotifyApi.getMyTopTracks({ limit: 12, time_range: 'medium_term' });
    const topTracksYear = topTracksYearResponse.body.items;

    // Get the user's top tracks for the past month
    const topTracksMonthResponse = await spotifyApi.getMyTopTracks({ limit: 12, time_range: 'short_term' });
    const topTracksMonth = topTracksMonthResponse.body.items;

    // Get the user's top artists and tracks for recommendation
    const topArtistsAllTimeIds = topArtistsAllTime.map(artist => artist.id);
    const topTracksAllTimeIds = topTracksAllTime.map(track => track.id);

    // Get related artists for recommended artists
    const relatedArtistsResponse = await Promise.all(topArtistsAllTimeIds.map(async artistId => {
        const relatedArtists = await spotifyApi.getArtistRelatedArtists(artistId);
        return relatedArtists.body.artists;
      }));
      const recommendedArtists = relatedArtistsResponse.flat().slice(0, 12);
  
    // Get recommended tracks based on top tracks
    const recommendedTracksResponse = await Promise.all(topTracksAllTimeIds.map(async trackId => {
        const recommendedTracks = await spotifyApi.getRecommendations({
          seed_tracks: [trackId],
          limit: 3
        });
        return recommendedTracks.body.tracks;
      }));
      const recommendedTracks = recommendedTracksResponse.flat().slice(0, 12);


    res.render('index', {
        topArtistsAllTime,
        topArtistsYear,
        topArtistsMonth,
        topTracksAllTime,
        topTracksYear,
        topTracksMonth,
        recommendedArtists,
        recommendedTracks // Add recommended tracks data to the render context
    });
  } catch (error) {
    console.error('Error:', error);
    console.error('Response:', error.response.body); // Print the response body for more details
    res.send('An error occurred. Check your console for details.');
  }
});

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.listen(8888, () => {
  console.log('Server started at http://localhost:8888');
});