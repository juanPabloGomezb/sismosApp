import { Component, AfterViewInit, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import axios from 'axios';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent],
})
export class FolderPage implements OnInit, AfterViewInit {
  public folder!: string;
  private activatedRoute = inject(ActivatedRoute);
  private map!: L.Map;
  private earthquakeApiUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=5';

  constructor() {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
  }



  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.loadEarthquakes();
    }, 500); // Pequeño retraso para asegurar que el DOM esté listo
  }

  private initMap(): void {
    if (this.map) {
      this.map.remove(); // Elimina el mapa si ya está creado para evitar errores
    }

    this.map = L.map('map', {
      center: [4.6097, -74.0817], // Bogotá, Colombia
      zoom: 6,
      minZoom: 3, // Evita alejarse demasiado
      maxZoom: 18,
      maxBounds: [
        [-90, -180], // Límite suroeste
        [90, 180] // Límite noreste
      ],
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private async loadEarthquakes(): Promise<void> {
    try {
      const response = await axios.get(this.earthquakeApiUrl);
      const earthquakes = response.data.features;

      earthquakes.forEach((quake: any) => {
        const lat = quake.geometry.coordinates[1];
        const lng = quake.geometry.coordinates[0];
        const mag = quake.properties.mag;
        const place = quake.properties.place;

        L.marker([lat, lng]).addTo(this.map)
          .bindPopup(`<b>${place}</b><br>Magnitud: ${mag}`);
      });
    } catch (error) {
      console.error('Error al obtener datos de sismos', error);
    }
  }
}
