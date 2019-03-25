const urlParams = new URLSearchParams(window.location.search);
let mode = +document.getElementById('mode').value;
document.getElementById('setMode').addEventListener('click', () => mode = +document.getElementById('mode').value);
const getMode = () => mode;
const code = urlParams.get('code');
if (!!code)
{
	window.opener.init(code).then(() => {
		console.log('hey')
	});
	window.close();
	
}
else
{
	
	const getAC =
		(code) => fetch('https://accounts.spotify.com/api/token',
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Basic MTk0MjcyNzRkYmNiNGQ5ODhmOGMzZTAzMjUwOGFkNWE6MDAxMDM1NDUwYTJlNDMxNGJiYTkyZDJiYjU3NDdjZmU=`
				},
				body: `code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent('https://mathis-m.github.io/Spotify2Color/')}`
			}).then(res => res.json());
	
	const getCurSong = (ac) => {
		const url = 'https://api.spotify.com/v1/me/player/currently-playing';
		return fetch(url, {
			headers: {
				'Authorization': `Bearer ${ac}`
			}
		}).then(response => response.json());
	};
	
	const getAnalysis = (id, ac) => {
		const url = 'https://api.spotify.com/v1/audio-analysis/';
		return fetch(url + id, {
			headers: {
				'Authorization': `Bearer ${ac}`
			}
		}).then(response => response.json());
	};
	
	const poll = async (ac, cb) => {
		let curSong = await getCurSong(ac);
		let maybe = {item: {id: ''}};
		setInterval(async () => {
			if (!curSong.is_playing) return;
			if (curSong.item.id !== maybe.item.id)
			{
				if (maybe.item.id !== '')
					curSong = {...maybe};
				cb(await getAnalysis(curSong.item.id, ac));
			}
			maybe = (await getCurSong(ac));
		}, 1000);
	};
	
	let timeOutIds = [];
	const buildColors = async (data, ac) => {
		timeOutIds.forEach((id) => {
			clearTimeout(id);
		});
		timeOutIds.length = 0;
		console.log(data);
		
		/*
		* Do Some thing to visualize
		* */
		const getRandomColors = (n) => {
			const colors = [];
			var letters = '0123456789ABCDEF';
			var color = '#';
			for (var j = 0; j < 6; j++)
			{
				color += letters[Math.floor(Math.random() * 16)];
			}
			for (let i = 0; i < n; i++)
			{
				colors.push(color);
			}
			
			return colors;
		};
		
		const song = await getCurSong(ac);
		const start_ms = song.progress_ms;
		const length_ms = song.item.duration_ms;
		const result_steps_ms = [];
		
		
		const bg = document.getElementById('bg');
		const tempDom = document.getElementById('temp');

		let curColor = '';
		const setColor = (pitches) => {
			const colorTemplate = (r, g, b) => `rgb(${r}%,${g}%,${b}%)`;
			let rgb = [];
			for (let i = 0; i < pitches.length; i = i + 4)
			{
				let p;
				if(i === 0){
					p = [.5,.2,.2,.1];
				} else if(i === 4){
					p = [.2,.5,.2,.1];
				} else if(i === 8){
					p = [.1,.2,.3,.4];
				}
				let j = 0;
				const forColor = pitches.slice(i, i+3).reduce((pv, cv) => pv + (cv * p[j++]) * 100, 0);
				let overAllOther = [...pitches.slice(0, i-1 < 0 ? 0: i - 1),...pitches.slice(i+4, pitches.length - 1)].reduce((pv, cv) => pv + cv * 100, 0) / (pitches.length - 4);
				rgb.push(((forColor * .8) + (overAllOther * .2)));
			}
			curColor = colorTemplate(...rgb);
		};
		const getCurColor = () => curColor;
		const setSegments = async () => {
			data.segments.forEach(segment => {
				if (segment.start * 1000 >= start_ms)
				{
					timeOutIds.push(setTimeout(() => {
						tempDom.innerText = segment.start;

						setColor(segment.pitches);
						if(getMode() === 2){
							bg.style.backgroundColor =`${getCurColor()}`;
						}
					}, (segment.start * 1000) - start_ms));
				}
			})
		};
		const setBeats = async () => {
			data.beats.forEach(beat => {
				if (beat.start * 1000 >= start_ms)
				{
					timeOutIds.push(setTimeout(() => {
						tempDom.innerText = beat.start;
						if(getMode() === 1){
							bg.style.backgroundColor = `${getCurColor()}`;
						}
						if(getMode() === 0){
							bg.style.backgroundColor = `${getRandomColors(1)[0]}`;
						}
						if(getMode() === 2){
							bg.style.backgroundColor = `white`;
						}
					}, (beat.start * 1000) - start_ms));
				}
			});
		};
		setSegments();
		setBeats();
		
	};
	
	const init = async (code) => {
		const ac = (await getAC(code)).access_token;
		await poll(ac, (analyseData) => buildColors(analyseData, ac));
	};
	
	
	window.init = init;
	window.open(`https://accounts.spotify.com/authorize?client_id=19427274dbcb4d988f8c3e032508ad5a&response_type=code&redirect_uri=${encodeURIComponent('https://mathis-m.github.io/Spotify2Color/')}&scope=user-read-currently-playing&show_dialog=true`, 'Login with Spotify', 'width=800,height=600');
	
}
