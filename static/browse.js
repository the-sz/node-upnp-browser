'use strict';

var container = undefined;
var lastItem = undefined;
var player = undefined;

function itemClicked(item)
{
	if (item.dataset.url != '')
	{
		//
		// play song
		//

		lastItem = item;

		if (player.src == item.dataset.url)
		{
			if (player.paused == true)
				player.play();
			else
				player.pause();
		}
		else
		{
			player.src = item.dataset.url;
			player.play();

			// set info in android notification bar
			if ('mediaSession' in navigator)
			{
				navigator.mediaSession.metadata = new MediaMetadata(
				{
					title: item.getElementsByClassName('item-title')[0].innerText,
					artist: item.getElementsByClassName('item-artist')[0].innerText,
					album: '',
				});
			}
		}

		updateUserInterface();
	}
	else
	{
		//
		// browse folder
		//

		// set new url
		const params = new URLSearchParams(window.location.search)
		const device = params.device || '0';
		history.pushState(null, null, ('?device='+device+'&id='+item.dataset.id));

		// load items
		loadItems(true);
	}
}

function updateUserInterface()
{
	// set all to normal
	Array.from(document.querySelectorAll('.item.file')).forEach((item) =>
	{
		item.classList.remove('playing');

		if (item == lastItem)
		{
			if (player.paused == false)
			{
				item.classList.add('playing');
			}
		}
	});
}

function loadItems(clearContainer)
{
	document.getElementById('loading').style.display = 'none';

	if (clearContainer == true)
	{
		// clear current list
		document.getElementById('item-list').replaceChildren();
	}

	// request new items
	const xhr = new XMLHttpRequest();

	const params = new URLSearchParams(window.location.search)
	const id = params.get('id') || '0';
	const device = params.get('device') || '0';

	xhr.open("GET", ('browse/'+device+'/'+id+'/'+container.children.length+'?_'+Date.now()), true);
	xhr.onload = (e) =>
	{
		if ((xhr.readyState === 4) && (xhr.status === 200))
		{
			const template = document.getElementById('template');

			const response = JSON.parse(xhr.responseText);

			document.title = response.title;

			response.items.forEach(function(item)
			{
				const node = template.content.firstElementChild.cloneNode(true);

				node.getElementsByClassName('item')[0].dataset.id = item.id;

				if (item.url != undefined)
					node.getElementsByClassName('item')[0].dataset.url = item.url;

				node.getElementsByClassName('item-title')[0].innerHTML = item.title;

				if (item.artist != undefined)
					node.getElementsByClassName('item-artist')[0].innerHTML = item.artist;

				if (item.size != undefined)
					node.getElementsByClassName('item-size')[0].innerHTML = (item.size / 1024 / 1024).toFixed(2) + " MB";

				if (item.duration != undefined)
				{
					var parts = item.duration.split(/:|\./);
					parts.pop();
					if (parts[0] == '0')
						parts.shift();
					parts[0] = parseInt(parts[0]);
					node.getElementsByClassName('item-duration')[0].innerHTML = parts.join(':');
				}

				if (item.folder == 1)
					node.getElementsByClassName('item')[0].classList.add('folder');
				else
					node.getElementsByClassName('item')[0].classList.add('file');

				container.appendChild(node);
			});

			if (response.items.length == response.requestCount)
				document.getElementById('loading').style.display = 'block';
		}
	};
	xhr.send(null);
}

(function()
{
	container = document.getElementById('item-list');

	// 'back' button
	window.addEventListener("popstate", (event) =>
	{
		loadItems(true);
	});

	// interset support
	let options =
	{
		root: null,
		rootMargin: '1000px',
		threshold: 0
	};

	function handleIntersect(entries, observer)
	{
		entries.forEach((entry) =>
		{
			if (entry.isIntersecting)
			{
				loadItems(false);
			}
		});
	}

	let observer = new IntersectionObserver(handleIntersect, options);
	observer.observe(document.getElementById('loading'));

	// player
	player = document.getElementById('player');

	player.addEventListener('ended', function()
	{
		updateUserInterface();
	});
	player.addEventListener('pause', function()
	{
		updateUserInterface();
	});
	player.addEventListener('play', function()
	{
		updateUserInterface();
	});
	player.addEventListener('error', function()
	{
		updateUserInterface();
	});

})();
