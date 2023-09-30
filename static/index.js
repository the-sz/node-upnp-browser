'use strict';

var container = undefined;

function loadItems()
{
	// request new items
	const xhr = new XMLHttpRequest();

	xhr.open("GET", ('devices?_'+Date.now()), true);
	xhr.onload = (e) =>
	{
		if ((xhr.readyState === 4) && (xhr.status === 200))
		{
			const params = new URLSearchParams(window.location.search)
			const id = params.get('id') || '0';

			const template = document.getElementById('template');

			const response = JSON.parse(xhr.responseText);

			response.forEach(function(item, index)
			{
				const node = template.content.firstElementChild.cloneNode(true);

				node.getElementsByClassName('device')[0].href = ('/browse.html?device='+index+'&id='+id);

				node.querySelector('.device-icon img').src = item.deviceIcon;

				node.getElementsByClassName('device-name')[0].innerHTML = item.name;
				node.getElementsByClassName('device-ip')[0].innerHTML = ' - ' + item.address;
				node.getElementsByClassName('device-details')[0].innerHTML = item.manufacturer + ' - ' + item.deviceName;

				container.appendChild(node);
			});
		}
	};
	xhr.send(null);
}

(function()
{
	container = document.getElementById('item-list');

	loadItems();

})();
