const urlParams = new URLSearchParams(window.location.search);
const getColorForPitchN = (n) => {
	let ret;
	switch (n)
	{
		case 0:
			ret = {r: 255, g: 0, b: 0};
			break;
		case 1:
			ret = {r: 255, g: 127, b: 0};
			break;
		case 2:
			ret = {r: 255, g: 255, b: 0};
			break;
		case 3:
			ret = {r: 127, g: 255, b: 0};
			break;
		case 4:
			ret = {r: 0, g: 255, b: 0};
			break;
		case 5:
			ret = {r: 0, g: 255, b: 127};
			break;
		case 6:
			ret = {r: 0, g: 255, b: 255};
			break;
		case 7:
			ret = {r: 0, g: 127, b: 255};
			break;
		case 8:
			ret = {r: 0, g: 0, b: 255};
			break;
		case 9:
			ret = {r: 127, g: 0, b: 255};
			break;
		case 10:
			ret = {r: 255, g: 0, b: 255};
			break;
		case 11:
			ret = {r: 255, g: 0, b: 127};
			break;
	}
	return {
		...ret,
		add: function (color) {
			this.r += color.r;
			this.g += color.g;
			this.b += color.b;
			return this;
		},
		multiply: function (d) {
			this.r *= d;
			this.g *= d;
			this.b *= d;
			return this;
		},
		div: function (d) {
			this.r /= d;
			this.g /= d;
			this.b /= d;
			return this;
		},
		getRGB: function () {
			return [this.r, this.g, this.b];
		},
		eq: function(color) {
			return this.r === color.r && this.g === color.g && this.b === color.b;
		}
	};
};

let colors = [];
for (let i = 0; i < 12; i++)
{
	colors.push(getColorForPitchN(i));
}
colors = colors.sort(function () { if (Math.random()<.5) return -1; else return 1; });
let mode = +document.getElementById('mode').value;
document.getElementById('setMode').addEventListener('click', () => mode = +document.getElementById('mode').value);
const getMode = () => mode;
const map1 = location.hash.substring(1).split('&').map(kv => kv.split('='));
const params = Array.from(map1).reduce((acc, [key, val]) => Object.assign(acc, {[key]: val}), {});
const code = params['access_token'];
if (false)
{
	window.opener.init(code).then(() => {
		console.log('hey')
	});
	window.close();
	
}
else
{
	
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
			const colors1 = [];
			var letters = '0123456789ABCDEF';
			var color = '#';
			for (var j = 0; j < 6; j++)
			{
				color += letters[Math.floor(Math.random() * 16)];
			}
			for (let i = 0; i < n; i++)
			{
				colors1.push(color);
			}
			
			return colors1;
		};
		
		const song = await getCurSong(ac);
		const start_ms = song.progress_ms;
		const length_ms = song.item.duration_ms;
		const result_steps_ms = [];
		
		
		const bg = document.getElementById('bg');
		const tempDom = document.getElementById('temp');
		
		let curColor = '';
		
		
		const getColorFor = (pitches) => {
			console.table(pitches);
			let sum = pitches.reduce((a, c) => a + c, 0);
			const pColors = [...colors];
			const pitchRatio = (pitch) =>  Math.floor((((pitch/sum) * 100) / sum) * 10) / 1000;
			let i = 0;
			const cSum = pColors.reduce((ac, cv) => ac.add({...cv}.multiply(pitchRatio(pitches[i++]))), {...pColors[0]}.multiply(pitchRatio(pitches[0])));
			console.log(cSum);
			return cSum;// cSum.div(partials.length);
		};
		
		let lastColor;
		const setColor = (rgb = getColorFor(curSegment.pitches), alpha) => {
			const colorTemplate = (r, g, b) => `rgb${alpha ? 'a' : ''}(${r}%,${g}%,${b}%${alpha ? `,${alpha}%` : ''})`;
			lastColor = curColor;
			curColor = colorTemplate(...rgb.getRGB());
		};
		const getCurColor = () => curColor;
		let curSegment;
		let z = true;
		const setSegments = async () => {
			data.segments.forEach(segment => {
				if (segment.start * 1000 >= start_ms)
				{
					timeOutIds.push(setTimeout(() => {
						z = !z;
						curSegment = segment;
						tempDom.innerText = segment.start;
						const c = getColorFor(segment.pitches);
						if(z){
							let index = -1;
							let value;
							let compVal = c.getRGB();
							colors.forEach((co, ind) => {
								let i = 0;
								const value1 = co.getRGB().reduce((ac, cv) => ac += Math.abs(compVal[i++] - cv));
								if((index === 0 || value1 < value)&& !lastColor.eq(co)){
									value = value1;
									index = ind;
								}
							});
							setColor(colors[index]);
						}else{
							setColor(c);
						}
						if (getMode() === 2 || getMode() === 3)
						{
							bg.style.backgroundColor = `${getCurColor()}`;
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
						if (getMode() === 1 || getMode() === 4)
						{
							bg.style.backgroundColor = `${getCurColor()}`;
						}
						if (getMode() === 0)
						{
							bg.style.backgroundColor = `${getRandomColors(1)[0]}`;
						}
						if (getMode() === 3 || getMode() === 4)
						{
							colors.push(colors.shift());
						}
					}, (beat.start * 1000) - start_ms));
				}
			});
		};
		setSegments();
		setBeats();
		
	};
	
	const init = async (ac) => {
		await poll(ac, (analyseData) => buildColors(analyseData, ac));
	};
	
	const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let array = new Uint8Array(40);
        crypto.getRandomValues(array);
        array = array.map(x => validChars.charCodeAt(x % validChars.length));
        const randomState = String.fromCharCode.apply(null, array);
	if(!code)
		window.location.href = `https://accounts.spotify.com/authorize?client_id=19427274dbcb4d988f8c3e032508ad5a&response_type=token&redirect_uri=${encodeURIComponent('https://mathis-m.github.io/Spotify2Color/')}&state=${randomState}&scope=user-read-currently-playing`;
	else init(code);
}


