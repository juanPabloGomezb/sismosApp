import { Component, AfterViewInit, OnInit, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import axios from 'axios';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonRange, IonItem, IonLabel, IonButton, IonInput } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  imports: [
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton, 
    IonTitle, 
    IonContent,
    IonRange,
    IonItem,
    IonLabel,
    IonButton,
    IonInput,
    FormsModule,
    DecimalPipe
  ],
})
export class FolderPage implements OnInit, AfterViewInit, OnDestroy {
  public folder!: string;
  private activatedRoute = inject(ActivatedRoute);
  private map!: L.Map;
  private markers: L.Layer[] = [];
  private resizeSubscription!: Subscription;
  
  // Parámetros de búsqueda de terremotos
  public latitude: number = 4.6097;  // Bogotá por defecto
  public longitude: number = -74.0817;
  public radius: number = 5;  // Radio en grados (aprox. 500km)
  public limit: number = 20;  // Límite de resultados
  
  constructor() {}
  
  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
  }
    
  
  private initMap(): void {
    if (this.map) {
      this.map.remove();
    }
    
    // Obtener referencia al contenedor del mapa
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('No se pudo encontrar el elemento del mapa');
      return;
    }
    
    // Establecer dimensiones explícitas al contenedor
    mapContainer.style.height = '70vh';
    mapContainer.style.width = '100%';
    
    // Forzar un reflow del DOM
    void mapContainer.offsetHeight;
    
    try {
      // Inicializar el mapa con opciones explícitas de tamaño
      this.map = L.map('map', {
        center: [this.latitude, this.longitude],
        zoom: 6,
        minZoom: 3,
        maxZoom: 18,
        maxBounds: [
          [-90, -180],
          [90, 180]
        ],
      });
      
      // Forzar una actualización del tamaño inmediatamente
      this.map.invalidateSize(true);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      
      // Añadir evento de clic para seleccionar ubicación
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.latitude = e.latlng.lat;
        this.longitude = e.latlng.lng;
        this.loadEarthquakes();
      });
    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
    }
  }
  
  // Mejora el ciclo de vida del componente
  ngAfterViewInit(): void {
    // Esperar a que el DOM esté completamente listo
    window.addEventListener('load', () => {
      this.setupMap();
    });
    
    // Si el evento load ya ocurrió, configurar el mapa de inmediato
    if (document.readyState === 'complete') {
      this.setupMap();
    }
    
    // Añadir observador de resize más efectivo
    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.handleResize();
      });
  }
  
  // Método separado para configurar el mapa
  private setupMap(): void {
    // Función para intentar inicializar varias veces
    const tryInitMap = (attempts = 0) => {
      if (attempts > 5) {
        console.error('No se pudo inicializar el mapa después de varios intentos');
        return;
      }
      
      try {
        this.initMap();
        this.loadEarthquakes();
        
        // Forzar actualización del mapa después de un tiempo
        setTimeout(() => {
          this.handleResize();
        }, 500);
      } catch (error) {
        console.error('Error al configurar el mapa, reintentando...', error);
        setTimeout(() => tryInitMap(attempts + 1), 300);
      }
    };
    
    tryInitMap();
  }
  
  // Manejador de cambio de tamaño explícito
  private handleResize(): void {
    if (!this.map) return;
    
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      // Actualizar dimensiones explícitamente
      mapContainer.style.height = '70vh';
      mapContainer.style.width = '100%';
      
      // Forzar reflow y actualización
      void mapContainer.offsetHeight;
      this.map.invalidateSize(true);
    }
  }
  
  // Modificar para usar el manejador de resize
  ngOnDestroy(): void {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
    
    if (this.map) {
      this.map.remove();
    }
  }
  
  // Método para actualizar el mapa con la configuración actual
  public updateMap(): void {
    this.loadEarthquakes();
  }
  
  // Calcula el radio aproximado en kilómetros
  public getRadiusInKm(): number {
    return Math.round(this.radius * 111.12);
  }
  
  // Método para cargar terremotos desde la API USGS
  private async loadEarthquakes(): Promise<void> {
    try {
      // Limpiar marcadores anteriores
      this.clearMarkers();
      
      // Construir URL con parámetros
      const apiUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${this.latitude}&longitude=${this.longitude}&maxradiuskm=${this.radius * 111.12}&limit=${this.limit}`;
      
      const response = await axios.get(apiUrl);
      const earthquakes = response.data.features;
      
      // Dibujar círculo de radio
      const radiusCircle = L.circle([this.latitude, this.longitude], {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.1,
        radius: this.radius * 111120, // Convertimos a metros (1 grado ≈ 111.12 km)
      }).addTo(this.map);
      
      this.markers.push(radiusCircle);
      
      // Centrar mapa en la ubicación seleccionada
      this.map.setView([this.latitude, this.longitude], this.getZoomForRadius(this.radius));
      
      // Añadir marcador en el centro
      const centerMarker = L.marker([this.latitude, this.longitude], {
        icon: L.divIcon({
          className: 'center-marker',
          html: '<div style="background-color:red;width:10px;height:10px;border-radius:50%;"></div>',
          iconSize: [10, 10]
        })
      }).addTo(this.map);
      
      centerMarker.bindPopup(`<b>Centro de búsqueda</b><br>Lat: ${this.latitude.toFixed(4)}, Lng: ${this.longitude.toFixed(4)}`);
      this.markers.push(centerMarker);
      
      // Añadir marcadores de terremotos
      earthquakes.forEach((quake: any) => {
        const lat = quake.geometry.coordinates[1];
        const lng = quake.geometry.coordinates[0];
        const mag = quake.properties.mag;
        const place = quake.properties.place;
        const time = new Date(quake.properties.time).toLocaleString();
        const depth = quake.geometry.coordinates[2];
        
        // Tamaño variable según magnitud
        const markerSize = Math.max(5, mag * 3);
        
        // Color variable según profundidad
        const color = this.getDepthColor(depth);
        
        const marker = L.circleMarker([lat, lng], {
          radius: markerSize,
          fillColor: color,
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(this.map);
        
        marker.bindPopup(`
          <h3>${place}</h3>
          <p><strong>Magnitud:</strong> ${mag}</p>
          <p><strong>Profundidad:</strong> ${depth} km</p>
          <p><strong>Fecha:</strong> ${time}</p>
          <p><strong>Coordenadas:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
        `);
        
        this.markers.push(marker);
      });
      
      // Mostrar mensaje si no hay terremotos
      if (earthquakes.length === 0) {
        console.log('No se encontraron terremotos en el radio especificado');
      }
      
      // Trigger a resize check after adding all markers
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    } catch (error) {
      console.error('Error al obtener datos de sismos', error);
    }
  }
  
  // Limpiar todos los marcadores del mapa
  private clearMarkers(): void {
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }
  
  // Obtener color según la profundidad del terremoto
  private getDepthColor(depth: number): string {
    if (depth < 10) return '#ff0000'; // Superficial - rojo
    if (depth < 50) return '#ff9900'; // Medio - naranja
    if (depth < 100) return '#ffff00'; // Profundo - amarillo
    if (depth < 300) return '#00ff00'; // Muy profundo - verde
    return '#0000ff'; // Extremadamente profundo - azul
  }
  
  // Calcular nivel de zoom adecuado basado en el radio
  private getZoomForRadius(radius: number): number {
    if (radius <= 1) return 10;
    if (radius <= 5) return 8;
    if (radius <= 10) return 7;
    if (radius <= 50) return 6;
    if (radius <= 100) return 5;
    return 4;
  }
}